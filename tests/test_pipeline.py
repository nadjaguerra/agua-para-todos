import json, math
import numpy as np
import pytest
from agua.pipeline import ROOT,percent,census_number,unique_index,description,moran,read_census,SEED

@pytest.fixture(scope='module')
def dataset():return json.loads((ROOT/'data/processed/dataset.json').read_text(encoding='utf-8'))
@pytest.fixture(scope='module')
def model():return json.loads((ROOT/'data/processed/analysis.json').read_text(encoding='utf-8'))

@pytest.mark.parametrize('value',[None,'Não calculado',float('nan'),float('inf'),-1,101,True])
def test_invalid_not_zero(value):assert percent(value) is None
def test_zero_and_hundred_are_valid():assert percent(0)==0 and percent(100)==100
def test_sidra_markers():
    assert census_number('-')==0
    assert census_number('X') is None
    assert census_number('...') is None
    assert census_number('..') is None
def test_duplicate_rejected():
    with pytest.raises(ValueError):unique_index([{'id':1},{'id':'1'}],'id')
def test_summary_known_values():
    s=description([0,20,40,60,80,None])
    assert s['n']==5 and s['mean']==40 and s['median']==40 and s['iqr']==40
def test_territorial_coverage(dataset):
    rows=dataset['rows'];assert len(rows)==185
    assert len({r['id'] for r in rows})==185
    assert sum(not r['district'] for r in rows)==184
    assert sum(r['rmr'] for r in rows)==14
def test_missing_are_preserved(dataset):
    absent=[r for r in dataset['rows'] if not r['available']]
    assert {r['name'] for r in absent}=={'Gameleira','Iati','Inajá','Itambé','Jaqueira'}
    assert all(r['atendimento'] is None and r['perdas'] is None for r in absent)
    assert all(r['semRede2022'] is not None for r in absent)
def test_quipapa_not_imputed(dataset):
    r=next(r for r in dataset['rows'] if r['name']=='Quipapá')
    assert r['atendimento'] is None and r['perdas']==15.72
    assert 'Não calculado' in r['atendimentoStatus']
def test_census_identity_and_denominator(dataset):
    c=read_census()
    for r in dataset['rows']:
        d=c[r['id']]
        assert d['72129']==d['72144']+d['72145']+d['72153']
        assert r['semRede2022']==pytest.approx(100*d['72153']/d['72129'])
def test_reference_years_separate(dataset):
    assert all(r['year']==2024 and r['censusYear']==2022 for r in dataset['rows'])
def test_model_cases(model,dataset):
    eligible={r['id'] for r in dataset['rows'] if not r['district'] and r['atendimento'] is not None and r['perdas'] is not None}
    assert set(model['ids'])==eligible and model['n']==178
def test_model_agrees_with_independent_least_squares(model):
    x=np.array([p['x'] for p in model['points']]);y=np.array([p['y'] for p in model['points']])
    coefficients=np.linalg.lstsq(np.column_stack([np.ones(len(x)),x]),y,rcond=None)[0]
    assert model['intercept']==pytest.approx(coefficients[0])
    assert model['slope']==pytest.approx(coefficients[1])
    assert abs(sum(p['residual'] for p in model['points']))<1e-8
def test_rank_correlation_known_permutation(model):
    # Independently rank without ties using averaged pandas ranks and correlate.
    import pandas as pd
    points=pd.DataFrame(model['points'])
    assert model['rho']==pytest.approx(points.x.rank().corr(points.y.rank()))
def test_loocv_beats_no_unearned_claim(model):
    assert model['loocv_rmse']>=model['loocv_baseline_rmse']
    assert model['moran_residuals']['p_permutacao']<.05
def test_moran_deterministic_and_detects_structure():
    coords=np.column_stack([np.linspace(-40,-35,30),np.repeat(-8,30)])
    a=moran(np.arange(30),coords,k=3,permutations=99)
    b=moran(np.arange(30),coords,k=3,permutations=99)
    assert a==b and a['I']>.7 and a['p_permutacao']<=.05
def test_published_recife_values(dataset):
    r=next(r for r in dataset['rows'] if r['id']=='2611606')
    assert r['atendimento']==78.93 and r['perdas']==44.2
def test_assets_synced():
    for name in ['dataset.json','analysis.json','municipios.csv','quality.json','sources.json']:
        assert (ROOT/'data/processed'/name).read_bytes()==(ROOT/'web/public/data'/name).read_bytes()
