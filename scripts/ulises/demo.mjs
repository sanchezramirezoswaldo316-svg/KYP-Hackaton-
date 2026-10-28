// Funciones de generación offline. Importar no lee, escribe ni descarga datos.
import { createHash } from 'node:crypto';
import { consultar69, consultar69B, consultarOfac, indexarOfac } from '../../src/lib/verificacion/listas-core.ts';
import { calcularPuntaje } from '../../src/lib/puntaje/reglas.ts';
import { COLUMNAS } from '../../src/lib/csv.ts';
import { clabeValida, rfcValido, normalizarTelefono } from '../../src/lib/validacion.ts';
export const SEMILLA = 20261028;
const ordenar = (a,b) => a < b ? -1 : a > b ? 1 : 0;
export function contextoListas({sat69b,sat69,ofac}) {
  const indice=indexarOfac(ofac);
  return fila => [consultar69B(sat69b,fila.rfc),consultar69(sat69,fila.rfc),consultarOfac(indice,fila.razon_social)];
}
export function generarDemo(listas, {semilla=SEMILLA,generado_en='2026-10-28T00:00:00Z'}={}) {
  if(!Number.isInteger(semilla)) throw new Error('Semilla debe ser entera');
  const evaluar=contextoListas(listas);
  let estado=semilla>>>0;
  const azar=()=>{estado=(Math.imul(1664525,estado)+1013904223)>>>0;return estado/2**32;};
  const mezclar=arr=>{arr=[...arr];for(let i=arr.length-1;i>0;i--){const j=Math.floor(azar()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;};
  const usados=new Set(), seleccion=[];
  const web={fuente:'web',resultado:'sin_sitio',detalle:'El proveedor no registró página web',fecha_fuente:null};
  const resultado=f=>calcularPuntaje([...evaluar(f),web]);
  function aceptar(f,categoria,origen) {
    if(usados.has(f.rfc)) throw new Error(`RFC repetido: ${f.rfc}`);
    usados.add(f.rfc);seleccion.push({...f,categoria,origen});
  }
  function satB(estatus,n) {
    let count=0;
    const candidatos=Object.entries(listas.sat69b.rfc).sort(([a],[b])=>ordenar(a,b)).filter(([r,v])=>r.length===12&&rfcValido(r)&&v[0]===estatus);
    for(const [r,v] of mezclar(candidatos)) {
      const f={rfc:r,razon_social:v[1]};const hs=evaluar(f);
      // Evitar cruces de fuentes para que estos ejemplos ilustren una regla aislada.
      if(usados.has(r)||hs[1].resultado!=='sin_coincidencia'||hs[2].resultado!=='sin_coincidencia') continue;
      aceptar(f,estatus,{rfc:'real_snapshot_sat',razon_social:'real_snapshot_sat',evidencia:'histórica',fuente:'sat_69b',estado:estatus,fecha_evento:v[2]});
      if(++count===n) return;
    }
    throw new Error(`Snapshot insuficiente: ${estatus}, necesarios ${n}, disponibles sin cruces ${count}`);
  }
  satB('presunto',15);satB('definitivo',10);satB('desvirtuado',4);satB('sentencia_favorable',2);
  let count69=0;
  const candidatos69=Object.entries(listas.sat69.rfc).sort(([a],[b])=>ordenar(a,b)).filter(([r,v])=>r.length===12&&rfcValido(r)&&!listas.sat69b.rfc[r]&&v.some(x=>x[0]==='no_localizado'));
  for(const [r,v] of mezclar(candidatos69)) {
    const f={rfc:r,razon_social:`Caso SAT histórico ${r} DEMO`};
    if(usados.has(r)||evaluar(f)[2].resultado!=='sin_coincidencia') continue;
    aceptar(f,'sat69',{rfc:'real_snapshot_sat',razon_social:'sintética_sin_nombre_en_snapshot',fuente:'sat_69',evidencia:'histórica',supuestos:v});
    if(++count69===4) break;
  }
  if(count69!==4) throw new Error('Snapshot insuficiente: Art. 69 sin cruces');
  let contador=0;
  function nuevoRfc() {
    for(let i=0;i<10000;i++){
      const r=`DMP${String(Math.floor(azar()*25)).padStart(2,'0')}${String(1+Math.floor(azar()*12)).padStart(2,'0')}${String(1+Math.floor(azar()*28)).padStart(2,'0')}${(contador++).toString(36).toUpperCase().padStart(3,'0').slice(-3)}`;
      if(!usados.has(r)&&!listas.sat69b.rfc[r]&&!listas.sat69.rfc[r]) return r;
    }
    throw new Error('No se pudo generar RFC sintético único');
  }
  let homonimo;
  const entidades=[...listas.ofac.entidades].sort((a,b)=>a[0]-b[0]||ordenar(a[1],b[1]));
  for(const e of entidades) {
    if(e[2]!=='entidad'||!/S\.?A\.? DE C\.?V\.?/.test(e[1])) continue;
    const nombre=e[1].replace(/[A-Z]{6,}/,s=>s.slice(0,-1)+(s.at(-1)==='Z'?'S':'Z'));
    if(nombre===e[1]) continue;
    const f={rfc:nuevoRfc(),razon_social:nombre};
    const hs=evaluar(f);
    if(hs[2].resultado!=='coincidencia_parecida') continue;
    aceptar(f,'homonimo_ofac',{rfc:'sintético',razon_social:'homónimo_sintético',fuente:'ofac',evidencia:'simulada_nombre_sobre_snapshot_histórico',base_sdn_id:e[0],base_nombre:e[1],coincidencia:hs[2].detalle});
    homonimo=f;break;
  }
  if(!homonimo) throw new Error('No se encontró homónimo sintético verificable');
  // 6 informativos SAT + 464 sintéticos = 470 liberables, no 470 ausentes del SAT.
  for(let i=0, intentos=0;i<464&&intentos<10000;intentos++) {
    const f={rfc:nuevoRfc(),razon_social:`Proveedor Sintético DEMO ${intentos+1} SA de CV`};
    if(evaluar(f).some(h=>h.resultado!=='sin_coincidencia')||resultado(f).decision!=='liberar') continue;
    aceptar(f,'limpio_sintetico',{rfc:'sintético',razon_social:'sintética',evidencia:'sin_alertas_en_esta_versión'});i++;
  }
  if(seleccion.length!==500) throw new Error('No se alcanzaron 500 filas verificadas');
  function clabe(){let base='002180';while(base.length<17)base+=Math.floor(azar()*10);const sum=[...base].reduce((s,d,i)=>s+Number(d)*[3,7,1][i%3]%10,0);return base+((10-sum%10)%10);}
  const filas=mezclar(seleccion).map((f,i)=>({rfc:f.rfc,razon_social:f.razon_social,sitio_web:null,telefono_registrado:`+52550000${String(i).padStart(4,'0')}`,clabe:clabe(),giro_declarado:'Caso de demostración; no usar en operaciones reales',monto_anual:200000+Math.floor(azar()*14800)*1000,factura_folio:`DEMO-${i+1}`,factura_monto:1000+Math.floor(azar()*100000)}));
  const porRfc=new Map(seleccion.map(f=>[f.rfc,f]));
  const casos=filas.map(f=>{const s=porRfc.get(f.rfc);const hs=evaluar(f);return {rfc:f.rfc,categoria:s.categoria,origen:s.origen,contacto_y_finanzas:'sintéticos; PROHIBIDO usar para llamadas o pagos reales',hallazgos_listas:hs,resultado_solo_listas:calcularPuntaje(hs),hallazgos_esperados:[...hs,web],resultado_esperado:calcularPuntaje([...hs,web])};});
  const conteos={liberar:0,revisar:0,bloquear:0};for(const c of casos)conteos[c.resultado_esperado.decision]++;
  if(conteos.liberar!==470||conteos.revisar+conteos.bloquear!==30)throw new Error(`Objetivo imposible con selección: ${JSON.stringify(conteos)}`);
  for(const f of filas)if(!rfcValido(f.rfc)||!clabeValida(f.clabe)||normalizarTelefono(f.telefono_registrado)!==f.telefono_registrado)throw new Error(`Datos inválidos ${f.rfc}`);
  const elegir=categoria=>filas.find(f=>porRfc.get(f.rfc).categoria===categoria);
  const inicial=[...filas.filter(f=>porRfc.get(f.rfc).categoria==='limpio_sintetico').slice(0,5),...filas.filter(f=>porRfc.get(f.rfc).categoria==='presunto').slice(0,2),...['definitivo','desvirtuado','sentencia_favorable','sat69','homonimo_ofac'].map(elegir)];
  const esc=v=>/[",\r\n]/.test(String(v??''))?`"${String(v).replaceAll('"','""')}"`:String(v??'');
  const csv=[COLUMNAS.join(','),...filas.map(f=>COLUMNAS.map(c=>esc(f[c])).join(','))].join('\n')+'\n';
  const version=d=>({fuente:d.fuente,url:d.url??null,actualizacion:d.actualizacion??null,descargado_en:d.descargado_en,sha256:d.sha256??null,listas:d.listas??null,hash_json_funcional:createHash('sha256').update(JSON.stringify(d.rfc??d.entidades)).digest('hex'),evidencia:'snapshot_histórico_no_verificado_como_actual'});
  const fuentes={sat_69b:version(listas.sat69b),sat_69:version(listas.sat69),ofac:version(listas.ofac)};
  const presunto=casos.find(c=>c.categoria==='presunto');
  const webSimulada={fuente:'web',resultado:'giro_no_coincide',detalle:'SIMULADO: fixture de ensayo, no consulta Firecrawl ni evidencia oficial',fecha_fuente:null};
  const escena={rfc:presunto.rfc,simulado:true,guia:'Usar hallazgos_listas + web simulada; sustituir sin_sitio, no añadirlo. No inyectado en API ni datos oficiales.',hallazgos:[...presunto.hallazgos_listas,webSimulada],resultado_esperado:calcularPuntaje([...presunto.hallazgos_listas,webSimulada])};
  return {filas,semilla:inicial,csv,escena,manifiesto:{version:1,semilla,generado_en,advertencia:'SOLO DEMO: no llamadas ni pagos reales. Hallazgos históricos, no afirmación de situación actual.',fuentes,conteos:{...conteos,total:500,excepciones:conteos.revisar+conteos.bloquear},semilla_rfc:inicial.map(f=>f.rfc),casos}};
}
