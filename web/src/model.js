export const PAGES=[['inicio','Início'],['mapa','Mapa do Abastecimento'],['comparar','Comparar Municípios'],['analise','Análise Estatística'],['cidadania','Água e Cidadania'],['metodologia','Metodologia e Dados']];
export const METRICS={
 atendimento:{label:'Atendimento pela rede',short:'Atendimento',year:2024,source:'SINISA 2025',code:'IAG0001',description:'Percentual da população atendida pela rede de abastecimento. Não mede continuidade do serviço nem potabilidade.',colors:['#edf6f7','#bddfdf','#78bfc1','#319195','#12676f']},
 perdas:{label:'Perdas na distribuição',short:'Perdas',year:2024,source:'SINISA 2025',code:'IAG2013',description:'Perdas totais em relação ao volume de entrada no sistema. Incluem perdas reais e aparentes; não representam apenas vazamentos ou desperdício doméstico.',colors:['#fff3e5','#fed5ab','#f8ad73','#d87540','#9d432a']},
 semRede2022:{label:'Domicílios sem ligação à rede',short:'Sem ligação',year:2022,source:'Censo 2022 · SIDRA 6803',code:'6803 / 72153',description:'Percentual de domicílios particulares permanentes ocupados sem ligação à rede geral. Podem existir outras formas de abastecimento. É um retrato de 2022, diferente do indicador populacional de 2024.',colors:['#f2eef8','#d9c9e9','#b397d0','#8665b0','#5e4087']}
};
export const fmt=(v,d=1)=>Number.isFinite(v)?new Intl.NumberFormat('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}).format(v):'Sem dados';
export const pct=v=>Number.isFinite(v)?`${fmt(v)}%`:'Sem dados';
export const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function filteredRows(rows,scope='pe',query=''){return rows.filter(r=>(scope==='noronha'?r.district:!r.district&&(scope!=='rmr'||r.rmr))&&normalize(r.name).includes(normalize(query)));}
export function colorFor(v,metric){if(!Number.isFinite(v))return '#c4cdd3';return METRICS[metric].colors[Math.min(4,Math.max(0,Math.floor(v/20)))];}
export function compare(a,b,key){return Number.isFinite(a?.[key])&&Number.isFinite(b?.[key])?a[key]-b[key]:null;}
export function readRoute(hash=''){
 const [raw,query]=hash.replace(/^#/,'').split('?');const params=new URLSearchParams(query||'');
 return {page:PAGES.some(([id])=>id===raw)?raw:'inicio',scope:['pe','rmr','noronha'].includes(params.get('scope'))?params.get('scope'):'pe',metric:Object.hasOwn(METRICS,params.get('metric'))?params.get('metric'):'atendimento',id:params.get('id')||'2611606',a:params.get('a')||'2611606',b:params.get('b')||'2609600'};
}
export function routeHash(route){const {page,...params}=route;return '#'+page+'?'+new URLSearchParams(params).toString();}
export function csvFromRows(rows){const keys=['id','name','year','atendimento','perdas','censusYear','semRede2022','atendimentoStatus','perdasStatus'];const escape=v=>'"'+String(v??'').replaceAll('"','""')+'"';return '\uFEFF'+[keys,...rows.map(r=>keys.map(k=>r[k]))].map(r=>r.map(escape).join(';')).join('\r\n');}
export function validateDataset(d,g){if(!Array.isArray(d.rows)||!d.rows.length)throw Error('A base municipal está vazia.');const ids=d.rows.map(r=>r.id);if(new Set(ids).size!==ids.length)throw Error('Há códigos duplicados na base.');if(!g.features?.length)throw Error('A malha está vazia.');const geo=new Set(g.features.map(f=>String(f.properties.codarea)));if(geo.size!==ids.length||ids.some(id=>!geo.has(id)))throw Error('O mapa e a base não correspondem.');return true;}
