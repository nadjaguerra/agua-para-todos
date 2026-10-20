import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<div id="app"></div>',{url:'http://localhost/#inicio',pretendToBeVisual:true});
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.location=dom.window.location;
const {h,render}=await import('preact');const {act}=await import('preact/test-utils');
await build({entryPoints:['src/App.jsx'],outfile:'.qa/app.mjs',bundle:true,platform:'node',format:'esm',jsxFactory:'h',jsxFragment:'Fragment',external:['preact','preact/hooks','leaflet','plotly.js-dist-min'],define:{'import.meta.env':'{"BASE_URL":"./"}'},plugins:[{name:'css-for-dom-test',setup(b){b.onResolve({filter:/\.css$/},a=>({path:a.path,namespace:'empty-css'}));b.onLoad({filter:/.*/,namespace:'empty-css'},()=>({contents:'',loader:'js'}));}}]});
const {App}=await import('../.qa/app.mjs');
const dataset=JSON.parse(await fs.readFile('public/data/dataset.json','utf8'));
const analysis=JSON.parse(await fs.readFile('public/data/analysis.json','utf8'));
const geo=JSON.parse(await fs.readFile('public/data/malha_pe.json','utf8'));
const root=document.getElementById('app');
async function mount(hash){await act(()=>render(null,root));location.hash=hash;await act(()=>render(h(App,{dataset,analysis,geo,enableVisuals:false}),root));}
function change(id,value){return act(()=>{const el=document.getElementById(id);assert.ok(el);el.value=value;el.dispatchEvent(new window.Event('change',{bubbles:true}));});}
test('seis páginas renderizam títulos e conteúdo',{concurrency:false},async()=>{
 for(const [id,title] of [['inicio','A água chega'],['mapa','Mapa do abastecimento'],['comparar','Compare municípios'],['analise','O que os dados mostram'],['cidadania','Compreender também'],['metodologia','De onde vêm']]){
  await mount('#'+id);assert.ok(root.querySelector('h1').textContent.includes(title));assert.equal(root.querySelectorAll('nav a').length,6);assert.equal(root.querySelectorAll('nav a[aria-current="page"]').length,1);
 }
});
test('troca de municípios e indicação de ausência',{concurrency:false},async()=>{
 await mount('#mapa');await change('municipality','2611507');
 assert.match(root.querySelector('.municipality-panel').textContent,/Quipapá/);
 assert.match(root.querySelector('.municipality-panel').textContent,/Não calculado/);
 await change('scope','rmr');assert.equal(document.getElementById('municipality').options.length,14);
 await change('indicator','semRede2022');assert.match(root.querySelector('.selected-value').textContent,/2022/);
});
test('comparação atualiza diferenças e inversão',{concurrency:false},async()=>{
 await mount('#comparar?a=2611606&b=2609600');assert.match(root.textContent,/6,94 p.p. abaixo/);
 await act(()=>root.querySelector('.swap').click());assert.match(root.textContent,/6,94 p.p. acima/);
 await change('compare-b','2609600');assert.match(root.textContent,/mesmo município/);
});
test('navegação principal responde ao clique',{concurrency:false},async()=>{
 await mount('#inicio');await act(()=>Array.from(root.querySelectorAll('nav a')).find(a=>a.textContent==='Análise Estatística').click());
 assert.match(root.querySelector('h1').textContent,/O que os dados mostram/);
 assert.match(root.textContent,/dependência espacial/);
});
