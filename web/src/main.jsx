import {h,render} from 'preact';
import {App} from './App';
import {validateDataset} from './model';
import './style.css';
const root=document.getElementById('app');
render(<div class="loading"><span class="drop">◒</span><h1>Água para Todos</h1><p>Carregando dados oficiais de Pernambuco…</p></div>,root);
Promise.all(['dataset.json','analysis.json','malha_pe.json'].map(async name=>{const r=await fetch(`${import.meta.env.BASE_URL}data/${name}`);if(!r.ok)throw Error(`Falha ao carregar ${name} (${r.status}).`);return r.json();})).then(([dataset,analysis,geo])=>{validateDataset(dataset,geo);render(<App dataset={dataset} analysis={analysis} geo={geo}/>,root);}).catch(error=>render(<div class="loading"><h1>Não foi possível carregar os dados</h1><p>{error.message}</p><p>Abra o projeto pelo servidor local, seguindo o LEIA-ME. Não abra o HTML com duplo clique.</p><button onClick={()=>location.reload()}>Tentar novamente</button></div>,root));
