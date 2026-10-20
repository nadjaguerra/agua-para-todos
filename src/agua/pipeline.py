from __future__ import annotations
import csv, hashlib, io, json, math, shutil, zipfile
from collections import Counter
from pathlib import Path
import numpy as np
import openpyxl
from scipy import stats
from scipy.spatial.distance import cdist
import statsmodels.api as sm
from statsmodels.stats.diagnostic import het_breuschpagan

ROOT = Path(__file__).resolve().parents[2]
RAW, OUT, PUBLIC = ROOT/'data/raw', ROOT/'data/processed', ROOT/'web/public/data'
SEED = 20261019
NORONHA = '2605459'

def finite(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)

def percent(v):
    return float(v) if finite(v) and 0 <= v <= 100 else None

def missing_reason(v):
    if percent(v) is not None: return None
    if v is None: return 'Sem informação na fonte'
    return str(v) if not finite(v) else 'Valor fora de 0 a 100; mantido no arquivo original'

def unique_index(rows, key):
    index = {}
    for row in rows:
        code = str(row[key])
        if code in index: raise ValueError(f'Código duplicado: {code}')
        index[code] = row
    return index

def read_sinisa(z, pattern):
    name = next(n for n in z.namelist() if pattern in n)
    wb = openpyxl.load_workbook(io.BytesIO(z.read(name)), read_only=True, data_only=True)
    rows = list(wb.worksheets[0].values)
    if rows[11][0] != 'cod_IBGE': raise ValueError('Cabeçalho SINISA alterado')
    items = [dict(zip(rows[11], r)) for r in rows[12:] if r[3] == 'PE']
    return unique_index(items,'cod_IBGE'), name, [str(r[2]) for r in rows[:8] if len(r)>2 and r[2]]

def census_number(v):
    # SIDRA: '-' representa zero absoluto; '..', '...' e 'X' não são números.
    if v == '-': return 0
    try: return int(v)
    except (TypeError,ValueError): return None

def read_census():
    payload = json.loads((RAW/'censo_agua_pe_2022.json').read_text(encoding='utf-8'))
    data = {}
    for result in payload[0]['resultados']:
        category = next(iter(result['classificacoes'][0]['categoria']))
        for series in result['series']:
            code=series['localidade']['id'];item=data.setdefault(code,{})
            if category in item: raise ValueError('Categoria censitária duplicada')
            item[category]=census_number(series['serie']['2022'])
    return data

def description(values):
    a=np.array([v for v in values if finite(v)],dtype=float)
    if not len(a): return dict(n=0,mean=None,median=None,std=None,q1=None,q3=None,iqr=None,min=None,max=None,outliers=[])
    q1,q3=np.quantile(a,[.25,.75]);iqr=q3-q1
    return dict(n=len(a),mean=float(a.mean()),median=float(np.median(a)),std=float(a.std(ddof=1)) if len(a)>1 else None,
                q1=float(q1),q3=float(q3),iqr=float(iqr),min=float(a.min()),max=float(a.max()),
                outliers=[float(v) for v in a if v<q1-1.5*iqr or v>q3+1.5*iqr])

def map_centers(geo):
    result={}
    for f in geo['features']:
        g=f['geometry'];polys=[g['coordinates']] if g['type']=='Polygon' else g['coordinates']
        ring=max((p[0] for p in polys),key=len)
        # Centro aproximado da caixa envolvente, utilizado só no diagnóstico kNN.
        p=np.array(ring);result[str(f['properties']['codarea'])]=[(p[:,0].min()+p[:,0].max())/2,(p[:,1].min()+p[:,1].max())/2]
    return result

def moran(values, coordinates, k=5, permutations=999):
    coords=np.asarray(coordinates,float).copy()
    coords[:,0]*=111.32*np.cos(np.radians(coords[:,1].mean()));coords[:,1]*=111.32
    distances=cdist(coords,coords);np.fill_diagonal(distances,np.inf)
    w=np.zeros_like(distances)
    for i in range(len(values)):w[i,np.argsort(distances[i])[:k]]=1
    w=np.maximum(w,w.T);w/=w.sum(axis=1,keepdims=True)
    z=np.asarray(values)-np.mean(values);den=float(z@z)
    if den==0:return dict(I=None,p_permutacao=None,k=k,permutations=permutations)
    observed=float(z@w@z/den);expected=-1/(len(z)-1)
    rng=np.random.default_rng(SEED);count=0
    for _ in range(permutations):
        p=rng.permutation(z);v=float(p@w@p/den)
        count+=abs(v-expected)>=abs(observed-expected)
    return dict(I=observed,p_permutacao=(count+1)/(permutations+1),k=k,permutations=permutations,
                method='5 vizinhos mais próximos, simetrização e padronização por linha; centros aproximados das caixas geográficas; 999 permutações bilaterais em torno de E[I]')

def fit_model(rows, geo):
    valid=[r for r in rows if r['id']!=NORONHA and r['atendimento'] is not None and r['perdas'] is not None]
    x=np.array([r['perdas'] for r in valid]);y=np.array([r['atendimento'] for r in valid]);X=sm.add_constant(x)
    base=sm.OLS(y,X,missing='raise').fit();robust=base.get_robustcov_results(cov_type='HC3',use_t=True)
    rho=float(stats.spearmanr(x,y).statistic)
    # Teste de permutação nominal: pressupõe permutabilidade dos municípios sob H0.
    rng=np.random.default_rng(SEED);rx=stats.rankdata(x);ry=stats.rankdata(y)
    rx=(rx-rx.mean())/np.linalg.norm(rx-rx.mean());ry=(ry-ry.mean())/np.linalg.norm(ry-ry.mean())
    count=sum(abs(float(rx@rng.permutation(ry)))>=abs(rho)-1e-12 for _ in range(9999))
    nominal=(count+1)/10000
    ci=robust.conf_int().tolist();grid=np.linspace(x.min(),x.max(),80)
    pred=robust.get_prediction(sm.add_constant(grid)).summary_frame(alpha=.05)
    influence=base.get_influence();cooks=influence.cooks_distance[0];threshold=4/len(x)
    loo_slopes=[float(sm.OLS(np.delete(y,i),sm.add_constant(np.delete(x,i))).fit().params[1]) for i in range(len(x))]
    residual=base.resid;hat=influence.hat_matrix_diag
    loo_errors=residual/(1-hat)
    baseline_loo=y-(y.sum()-y)/(len(y)-1)
    bp=het_breuschpagan(residual,X)
    centers=map_centers(geo);coordinates=[centers[r['id']] for r in valid]
    spatial=moran(residual,coordinates)
    # Modelo fracional logit como análise de sensibilidade para resposta limitada.
    fractional=sm.GLM(y/100,X,family=sm.families.Binomial()).fit(cov_type='HC3')
    return dict(n=len(x),ids=[r['id'] for r in valid],rho=rho,p_permutation_nominal=nominal,permutations=9999,
      intercept=float(base.params[0]),slope=float(base.params[1]),slope_ci95_hc3=ci[1],p_slope_hc3_nominal=float(robust.pvalues[1]),
      r2=float(base.rsquared),rmse_in_sample=float(np.sqrt(np.mean(residual**2))),
      loocv_rmse=float(np.sqrt(np.mean(loo_errors**2))),loocv_baseline_rmse=float(np.sqrt(np.mean(baseline_loo**2))),
      loo_slope_min=min(loo_slopes),loo_slope_max=max(loo_slopes),breusch_pagan_p=float(bp[1]),
      fitted_outside_0_100=int(np.sum((base.fittedvalues<0)|(base.fittedvalues>100))),
      influential=[dict(id=r['id'],name=r['name'],cooks_d=float(v)) for r,v in zip(valid,cooks) if v>threshold],
      moran_residuals=spatial,
      fractional_logit=dict(slope=float(fractional.params[1]),converged=bool(fractional.converged),predicted_min=float(fractional.fittedvalues.min()*100),predicted_max=float(fractional.fittedvalues.max()*100)),
      curve=dict(x=grid.tolist(),y=pred['mean'].tolist(),lower=pred['mean_ci_lower'].tolist(),upper=pred['mean_ci_upper'].tolist(),fractional=(fractional.predict(sm.add_constant(grid))*100).tolist()),
      points=[dict(id=r['id'],name=r['name'],x=float(a),y=float(b),fitted=float(f),residual=float(e)) for r,a,b,f,e in zip(valid,x,y,base.fittedvalues,residual)],
      caution='Análise ecológica transversal e exploratória de casos completos. IC e valores-p são nominais, condicionais aos pressupostos do modelo; HC3 não corrige dependência espacial ou sistemas compartilhados. Municípios não são amostra aleatória. Não interpretar como causalidade ou previsão validada para outros anos. LOOCV não é validação geográfica independente.')

def write_json(path, value):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2,allow_nan=False),encoding='utf-8')

def run():
    OUT.mkdir(exist_ok=True,parents=True);PUBLIC.mkdir(exist_ok=True,parents=True)
    z=zipfile.ZipFile(RAW/'SINISA_Resultados_Ref2024.zip')
    if z.testzip():raise ValueError('ZIP corrompido')
    indicators,indfile,inddates=read_sinisa(z,'Indicadores_Base Municipal')
    technical,techfile,techdates=read_sinisa(z,'Informações_Gestão Técnica de Água_Base Municipal')
    if set(indicators)!=set(technical):raise ValueError('Base técnica e indicadores não coincidem')
    census=read_census();registry=json.loads((RAW/'municipios_ibge_pe.json').read_text(encoding='utf-8'))
    registry_index=unique_index(registry,'id');geo=json.loads((RAW/'malha_pe.json').read_text(encoding='utf-8'))
    geocodes=[str(f['properties']['codarea']) for f in geo['features']]
    if len(geocodes)!=len(set(geocodes)):raise ValueError('Geometrias duplicadas')
    if set(geocodes)!=set(registry_index):raise ValueError('Cadastro e malha não coincidem')
    if not set(indicators)<=set(registry_index):raise ValueError('Código SINISA inválido')
    rows=[];rechecks=[];census_checks=[]
    for code,loc in sorted(registry_index.items()):
        r=indicators.get(code);t=technical.get(code);c=census.get(code,{})
        total=c.get('72129');no_network=c.get('72153');categories=[c.get(k) for k in ['72144','72145','72153']]
        if total is not None and all(v is not None for v in categories):
            if sum(categories)!=total:raise ValueError(f'Categorias censitárias não somam o total: {code}')
            census_checks.append(code)
        item=dict(id=code,name=loc['nome'],district=code==NORONHA,rmr=bool(r and r['RM/RIDE']=='RM de Recife (PE)'),
          available=r is not None,year=2024,atendimento=percent(r['IAG0001']) if r else None,perdas=percent(r['IAG2013']) if r else None,
          urbano=percent(r['IAG0002']) if r else None,rural=percent(r['IAG0003']) if r else None,
          atendimentoStatus=missing_reason(r['IAG0001']) if r else 'Localidade ausente desta base SINISA',
          perdasStatus=missing_reason(r['IAG2013']) if r else 'Localidade ausente desta base SINISA',
          population=t['DFE0001'] if t else None,provider=r['CAD0005'] if r else None,
          censusYear=2022,households2022=total,householdsWithoutNetwork2022=no_network,
          semRede2022=100*no_network/total if total and no_network is not None else None)
        rows.append(item)
        if r:
            for k,fields,calc in [('IAG0001',['GTA0001','GTA0002','DFE0001'],lambda t:100*(t['GTA0001']+t['GTA0002'])/t['DFE0001']),
              ('IAG2013',['GTA1001','GTA1009','GTA1207','GTA1211','GTA1203'],lambda t:100*(t['GTA1001']+t['GTA1009']-t['GTA1207']-t['GTA1211']-t['GTA1203'])/(t['GTA1001']+t['GTA1009']))]:
                if percent(r[k]) is not None and all(finite(t.get(f)) for f in fields):
                    v=calc(t);delta=abs(v-r[k]);rechecks.append(dict(id=code,indicator=k,published=r[k],recalculated=v,difference=delta,passed=delta<=.011))
    if not all(r['passed'] for r in rechecks):raise ValueError('Recálculo diverge do indicador publicado')
    municipalities=[r for r in rows if not r['district']]
    statistics={scope:{metric:description([r[metric] for r in municipalities if scope=='pe' or r['rmr']]) for metric in ['atendimento','perdas','semRede2022']} for scope in ['pe','rmr']}
    model=fit_model(rows,geo)
    quality=dict(totalMunicipalities=len(municipalities),sinisaMunicipalities=sum(r['available'] for r in municipalities),
      completePairs=model['n'],missingMunicipalities=[r['name'] for r in municipalities if not r['available']],
      nonCalculated=[r['name'] for r in municipalities if r['available'] and r['atendimento'] is None],
      rmrCount=sum(r['rmr'] for r in rows),censusLocalities=len(census),censusSumChecks=len(census_checks),mapLocalities=len(geocodes),
      formulasChecked=len(rechecks),formulasPassed=sum(r['passed'] for r in rechecks),duplicateCodes=0)
    sources=[dict(name='SINISA 2025 — referência 2024',file='SINISA_Resultados_Ref2024.zip',url='https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/saneamento/sinisa/resultados-sinisa/SINISA_Resultados_Ref2024.zip'),
      dict(name='IBGE — Cadastro de localidades',file='municipios_ibge_pe.json',url='https://servicodados.ibge.gov.br/api/v1/localidades/estados/26/municipios'),
      dict(name='IBGE — Malha municipal simplificada',file='malha_pe.json',url='https://servicodados.ibge.gov.br/api/v3/malhas/estados/26?formato=application%2Fvnd.geo%2Bjson&qualidade=intermediaria&intrarregiao=municipio'),
      dict(name='Censo 2022 — SIDRA 6803',file='censo_agua_pe_2022.json',url='https://servicodados.ibge.gov.br/api/v3/agregados/6803/periodos/2022/variaveis/381?localidades=N6[N3[26]]&classificacao=1821[72129,72144,72145,72153]'),
      dict(name='Metadados SIDRA 6803',file='sidra_6803_metadados.json',url='https://servicodados.ibge.gov.br/api/v3/agregados/6803/metadados')]
    for s in sources:s.update(sha256=hashlib.sha256((RAW/s['file']).read_bytes()).hexdigest(),collected='2026-10-19')
    meta=dict(updated='2026-10-19',year=2024,censusYear=2022,sources=sources,sinisaFiles=[indfile,techfile],sinisaMetadata=[inddates,techdates],
      note='Sem imputação. Percentuais na escala 0–100. Medianas referem-se a municípios, não ao percentual estadual agregado. Malha simplificada obtida da API na data da coleta; não é mapa de tubulações nem de bairros.')
    dataset=dict(meta=meta,quality=quality,rows=rows,statistics=statistics)
    write_json(OUT/'dataset.json',dataset);write_json(OUT/'analysis.json',model);write_json(OUT/'quality.json',quality);write_json(OUT/'sources.json',meta)
    with (OUT/'municipios.csv').open('w',encoding='utf-8-sig',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
    with (OUT/'formula_checks.csv').open('w',encoding='utf-8-sig',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=list(rechecks[0]));writer.writeheader();writer.writerows(rechecks)
    for name in ['dataset.json','analysis.json','municipios.csv','quality.json','sources.json']:shutil.copyfile(OUT/name,PUBLIC/name)
    shutil.copyfile(RAW/'malha_pe.json',PUBLIC/'malha_pe.json')
    print(json.dumps(quality,ensure_ascii=False,indent=2))
    print('Modelo:',json.dumps({k:model[k] for k in ['rho','slope','slope_ci95_hc3','r2','moran_residuals','fitted_outside_0_100','loocv_rmse','loocv_baseline_rmse']},ensure_ascii=False))

if __name__=='__main__':run()
