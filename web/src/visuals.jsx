import {h} from 'preact';
import {useEffect,useRef,useState} from 'preact/hooks';
import {METRICS,colorFor,pct} from './model';
import 'leaflet/dist/leaflet.css';

export function MapView({geo,rows,metric,selected,onSelect,compact=false,enabled=true}){
 const host=useRef(null),api=useRef(null),callback=useRef(onSelect);callback.current=onSelect;const [error,setError]=useState('');
 useEffect(()=>{if(!enabled)return;let canceled=false;import('leaflet').then(mod=>{if(canceled)return;const L=mod.default;
  const map=L.map(host.current,{zoomControl:true,scrollWheelZoom:false,minZoom:5,maxZoom:13,attributionControl:true});
  map.attributionControl.setPrefix(false);map.attributionControl.addAttribution('IBGE · malha simplificada');
  api.current={L,map,layer:null};map.on('focus',()=>map.scrollWheelZoom.enable());map.on('blur',()=>map.scrollWheelZoom.disable());update();
 }).catch(()=>setError('Não foi possível abrir o mapa. A tabela abaixo continua disponível.'));
 function update(){if(!api.current)return;const {L,map}=api.current;const byId=new Map(rows.map(r=>[r.id,r]));
  const features=geo.features.filter(f=>byId.has(String(f.properties.codarea)));
  const layer=L.geoJSON({type:'FeatureCollection',features},{style:f=>{const id=String(f.properties.codarea);return {fillColor:colorFor(byId.get(id)[metric],metric),fillOpacity:.92,color:id===selected?'#102d42':'#fff',weight:id===selected?2.7:.7};},onEachFeature:(f,l)=>{const r=byId.get(String(f.properties.codarea));
   const text=document.createElement('div');const strong=document.createElement('strong');strong.textContent=r.name;text.append(strong,document.createElement('br'),document.createTextNode(`${METRICS[metric].short}: ${pct(r[metric])} · ${METRICS[metric].year}`));l.bindTooltip(text,{sticky:true,direction:'top'});
   l.on('click',()=>callback.current?.(r.id));
  }}).addTo(map);api.current.layer=layer;
  if(features.length)map.fitBounds(layer.getBounds(),{padding:[compact?12:25,25],maxZoom:10});
 }
 return ()=>{canceled=true;if(api.current){api.current.map.remove();api.current=null;}};
 },[geo,rows,metric,selected,enabled,compact]);
 return <div class={'map-wrap '+(compact?'compact':'')}><div ref={host} class="map-canvas" role="img" aria-label={`Mapa de ${METRICS[metric].label}. Os mesmos dados estão disponíveis na tabela e no seletor de municípios.`}/>{error&&<p class="map-error" role="alert">{error}</p>}<div class="map-watermark" aria-hidden="true">PERNAMBUCO <span>BRASIL</span></div></div>;
}

export function Chart({data,layout={},label,enabled=true}){
 const ref=useRef(null),plot=useRef(null);const [error,setError]=useState('');
 useEffect(()=>{if(!enabled)return;let canceled=false;let observer;
  import('plotly.js-dist-min').then(m=>{if(canceled)return;const P=m.default;plot.current=P;
   return P.react(ref.current,data,{autosize:true,paper_bgcolor:'transparent',plot_bgcolor:'transparent',font:{family:'Arial, sans-serif',size:12,color:'#415869'},margin:{t:25,r:25,b:55,l:60},colorway:['#167e83','#d78749'],...layout},{responsive:true,displaylogo:false,modeBarButtonsToRemove:['select2d','lasso2d','autoScale2d'],toImageButtonOptions:{format:'png',filename:'agua-para-todos'}}).then(()=>{if(canceled)return;observer=new ResizeObserver(()=>P.Plots.resize(ref.current));observer.observe(ref.current);});
  }).catch(()=>{if(!canceled)setError('O gráfico não carregou. Consulte os valores na tabela e no arquivo de dados.');});
  return()=>{canceled=true;observer?.disconnect();if(plot.current&&ref.current)plot.current.purge(ref.current);};
 },[data,layout,enabled]);
 return <div class="chart-wrapper"><div class="chart" ref={ref} role="img" aria-label={label}/>{error&&<p role="alert">{error}</p>}</div>;
}
