import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/',pretendToBeVisual:true});
globalThis.window=dom.window;globalThis.document=dom.window.document;
Object.defineProperty(window.SVGSVGElement.prototype,'createSVGRect',{value:()=>({})});
Object.defineProperty(window.HTMLElement.prototype,'clientWidth',{get:()=>800});
Object.defineProperty(window.HTMLElement.prototype,'clientHeight',{get:()=>500});
const {h,render}=await import('preact');const {act}=await import('preact/test-utils');
await build({entryPoints:['src/visuals.jsx'],outfile:'.qa/visuals.mjs',bundle:true,platform:'node',format:'esm',jsxFactory:'h',external:['preact','preact/hooks','leaflet','plotly.js-dist-min'],plugins:[{name:'css-test',setup(b){b.onResolve({filter:/\.css$/},a=>({path:a.path,namespace:'empty'}));b.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:'',loader:'js'}));}}]});
const {MapView}=await import('../.qa/visuals.mjs');
const dataset=JSON.parse(await fs.readFile('public/data/dataset.json','utf8'));
const geo=JSON.parse(await fs.readFile('public/data/malha_pe.json','utf8'));
const root=document.getElementById('root');
async function waitForPaths(n){for(let i=0;i<60;i++){if(root.querySelectorAll('path.leaflet-interactive').length===n)return;await new Promise(r=>setTimeout(r,10));}assert.equal(root.querySelectorAll('path.leaflet-interactive').length,n);}
test('Leaflet desenha as geometrias e o clique retorna o código correto',async()=>{
 const rows=dataset.rows.filter(r=>!r.district);let selected;
 await act(()=>render(h(MapView,{geo,rows,metric:'atendimento',onSelect:id=>{selected=id;},enabled:true}),root));
 await waitForPaths(184);
 const first=geo.features.find(f=>rows.some(r=>r.id===String(f.properties.codarea)));
 root.querySelector('path.leaflet-interactive').dispatchEvent(new window.MouseEvent('click',{bubbles:true,clientX:100,clientY:100}));
 assert.equal(selected,String(first.properties.codarea));
 assert.ok(root.querySelector('[fill="#c4cdd3"]'),'Ausências têm cor própria');
 await act(()=>render(h(MapView,{geo,rows:rows.filter(r=>r.rmr),metric:'perdas',enabled:true}),root));
 await waitForPaths(14);
 await act(()=>render(null,root));assert.equal(root.querySelectorAll('.leaflet-container').length,0);
});
