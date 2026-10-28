// Medición offline reproducible; no modifica snapshots ni llama servicios externos.
import fs from 'node:fs';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { indexarOfac, consultarOfac, consultar69, consultar69B } from '../../src/lib/verificacion/listas-core.ts';
import { calcularPuntaje } from '../../src/lib/puntaje/reglas.ts';
import { parseCsv } from './sat.mjs';
const inicio=performance.now();
const d=JSON.parse(fs.readFileSync('src/data/ofac-sdn.json','utf8'));
const lectura=performance.now()-inicio;
const t=performance.now();const indice=indexarOfac(d);const indexacion=performance.now()-t;
const a=JSON.parse(fs.readFileSync('src/data/sat-69.json','utf8'));
const b=JSON.parse(fs.readFileSync('src/data/sat-69b.json','utf8'));
const rows=parseCsv(fs.readFileSync('public/demo/proveedores-demo.csv','utf8')).slice(1);
const resumen=valores=>{const orden=[...valores].sort((a,b)=>a-b);return {min_ms:orden[0],mediana_ms:orden[Math.floor(orden.length/2)],max_ms:orden.at(-1)};};
// Una pasada de calentamiento y cinco medidas; misma lista y mismos nombres.
rows.forEach(r=>consultarOfac(indice,r[1]));
const busqueda=[],masiva=[],individual=[];let resultados;
for(let vuelta=0;vuelta<5;vuelta++){
  const conteos={};const start=performance.now();
  for(const r of rows){const ti=performance.now();const h=consultarOfac(indice,r[1]);individual.push(performance.now()-ti);conteos[h.resultado]=(conteos[h.resultado]??0)+1;}
  busqueda.push(performance.now()-start);resultados=conteos;
  const tm=performance.now();
  for(const r of rows) calcularPuntaje([consultar69(a,r[0]),consultar69B(b,r[0]),consultarOfac(indice,r[1]),{fuente:'web',resultado:'sin_sitio',detalle:'Demo sin sitio',fecha_fuente:null}]);
  masiva.push(performance.now()-tm);
}
console.log(JSON.stringify({hardware:{cpu:os.cpus()[0]?.model,cores:os.cpus().length,ram_bytes:os.totalmem(),plataforma:os.platform(),arch:os.arch(),runtime:process.version},snapshot:{registros:d.registros,sha256:d.sha256,descargado_en:d.descargado_en},proveedores:rows.length,calentamientos:1,repeticiones:5,lectura_json_ms:lectura,indexacion_ms:indexacion,busqueda_500:resumen(busqueda),consulta_individual:resumen(individual),lote_listas_y_puntaje_500:resumen(masiva),resultados,limite:'Medición local en memoria; no incluye HTTP, BD, interfaz, IA ni despliegue. No predice producción.'},null,2));
