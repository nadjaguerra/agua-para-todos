"""Download de fontes públicas com gzip e hashes; não sobrescreve arquivos válidos."""
from pathlib import Path
import concurrent.futures, gzip, hashlib, io, json, sys, urllib.request, zipfile
ROOT=Path(__file__).resolve().parent
RAW=ROOT/'data/raw'
SOURCES={
 'SINISA_Resultados_Ref2024.zip':'https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/saneamento/sinisa/resultados-sinisa/SINISA_Resultados_Ref2024.zip',
 'municipios_ibge_pe.json':'https://servicodados.ibge.gov.br/api/v1/localidades/estados/26/municipios',
 'malha_pe.json':'https://servicodados.ibge.gov.br/api/v3/malhas/estados/26?formato=application%2Fvnd.geo%2Bjson&qualidade=intermediaria&intrarregiao=municipio',
 'sidra_6803_metadados.json':'https://servicodados.ibge.gov.br/api/v3/agregados/6803/metadados',
 'censo_agua_pe_2022.json':'https://servicodados.ibge.gov.br/api/v3/agregados/6803/periodos/2022/variaveis/381?localidades=N6[N3[26]]&classificacao=1821[72129,72144,72145,72153]',
}
def get(item):
 name,url=item;p=RAW/name
 if not p.exists():
  req=urllib.request.Request(url,headers={'User-Agent':'AguaParaTodos-Academic/1.0','Accept-Encoding':'gzip'})
  with urllib.request.urlopen(req,timeout=45) as response: b=response.read()
  if b[:2]==b'\x1f\x8b':b=gzip.decompress(b)
  if name.endswith('.zip'):
   with zipfile.ZipFile(io.BytesIO(b)) as z:
    if z.testzip(): raise ValueError('ZIP corrompido')
  else: json.loads(b)
  temporary=p.with_suffix(p.suffix+'.tmp');temporary.write_bytes(b);temporary.replace(p)
 return name,len(p.read_bytes()),hashlib.sha256(p.read_bytes()).hexdigest()
if __name__=='__main__':
 RAW.mkdir(parents=True,exist_ok=True)
 failed=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  tasks={pool.submit(get,i):i for i in SOURCES.items()}
  for f in concurrent.futures.as_completed(tasks):
   try:print(f.result(),flush=True)
   except Exception as e:
    failed.append(tasks[f][0]);print(tasks[f][0],type(e).__name__,str(e),flush=True)
 if failed:sys.exit('Falha nas fontes: '+', '.join(failed))
