import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generarDemo, contextoListas } from '../../../scripts/ulises/demo.mjs';
import { filasAAltas } from '../csv.ts';
import { calcularPuntaje } from '../puntaje/reglas.ts';
import { clabeValida, rfcValido, normalizarTelefono } from '../validacion.ts';
const leer=(n:string)=>JSON.parse(readFileSync(`src/data/${n}.json`,'utf8'));
const listas={sat69b:leer('sat-69b'),sat69:leer('sat-69'),ofac:leer('ofac-sdn')};
const demo=generarDemo(listas);

test('regeneración determinista, fecha no altera datos funcionales y artefactos coinciden',()=>{
  const otra=generarDemo(listas,{generado_en:'2030-01-01T00:00:00Z'});
  assert.equal(demo.csv,otra.csv);
  assert.deepEqual(demo.semilla,otra.semilla);
  assert.deepEqual(demo.escena,otra.escena);
  assert.deepEqual(demo.manifiesto.casos,otra.manifiesto.casos);
  assert.equal(demo.csv,readFileSync('public/demo/proveedores-demo.csv','utf8'));
  assert.deepEqual(demo.semilla,leer('demo-semilla'));
  assert.deepEqual(demo.manifiesto,JSON.parse(readFileSync('datos/demo-manifiesto.json','utf8')));
});
test('importación CSV compatible: 500 RFC únicos, teléfonos y CLABE válidos, finanzas sintéticas',()=>{
  const filas=filasAAltas(demo.csv);
  assert.equal(filas.length,500);assert.equal(new Set(filas.map(f=>f.rfc)).size,500);
  for(const f of filas){
    assert.equal(f.rfc.length,12);assert.ok(rfcValido(f.rfc));assert.ok(clabeValida(f.clabe!));
    assert.match(f.telefono_registrado,/^\+52\d{10}$/);assert.equal(normalizarTelefono(f.telefono_registrado),f.telefono_registrado);
    assert.ok(f.monto_anual>0);assert.ok(f.factura_monto!>0);assert.match(f.factura_folio!,/^DEMO-/);
    assert.equal(f.sitio_web,null);
  }
  assert.equal(new Set(filas.map(f=>f.factura_folio)).size,500);
  assert.equal(demo.semilla.length,12);assert.equal(new Set(demo.semilla.map(f=>f.rfc)).size,12);
  for(const f of demo.semilla)assert.deepEqual(f,filas.find(r=>r.rfc===f.rfc));
});
test('470/30 calculado con consultas reales y motor, incluyendo cruces',()=>{
  const evaluar=contextoListas(listas);
  const conteos={liberar:0,revisar:0,bloquear:0};
  for(const f of demo.filas){
    const c=demo.manifiesto.casos.find(c=>c.rfc===f.rfc)!;
    const hs=evaluar(f);
    assert.deepEqual(c.hallazgos_listas,hs);
    assert.deepEqual(c.resultado_solo_listas,calcularPuntaje(hs));
    const r=calcularPuntaje([...hs,{fuente:'web',resultado:'sin_sitio',detalle:'Sin web',fecha_fuente:null}]);
    assert.deepEqual(r,c.resultado_esperado);
    conteos[r.decision]++;
  }
  assert.equal(conteos.liberar,470);assert.equal(conteos.revisar+conteos.bloquear,30);
  assert.deepEqual({...conteos,total:500,excepciones:30},demo.manifiesto.conteos);
});
test('escenarios base sin penalización informativa, selección sin reemplazo y evidencia histórica',()=>{
  for(const [categoria,puntos] of [['presunto',60],['definitivo',100],['desvirtuado',0],['sentencia_favorable',0],['sat69',30],['homonimo_ofac',25]] as const){
    const casos=demo.manifiesto.casos.filter(c=>c.categoria===categoria);
    assert.ok(casos.length>0);
    for(const c of casos){assert.equal(c.resultado_solo_listas.puntaje,puntos);assert.equal(c.resultado_esperado.puntaje,Math.min(100,puntos+10));}
  }
  for(const c of demo.manifiesto.casos){
    if(c.origen.fuente==='sat_69b'){
      assert.equal(c.origen.evidencia,'histórica');
      assert.equal(listas.sat69b.rfc[c.rfc][0],c.categoria);
      assert.equal(demo.filas.find(f=>f.rfc===c.rfc)!.razon_social,listas.sat69b.rfc[c.rfc][1]);
    }
    if(c.categoria==='desvirtuado'||c.categoria==='sentencia_favorable')assert.equal(c.resultado_esperado.decision,'liberar');
    if(c.categoria==='limpio_sintetico')assert.ok(c.hallazgos_listas.every(h=>h.resultado==='sin_coincidencia'));
    if(c.categoria==='homonimo_ofac')assert.equal(c.resultado_solo_listas.bloqueo_directo,false);
  }
});
test('escena separada presunto + web simulada da 80 sin inyectar sin_sitio',()=>{
  const e=demo.escena;
  assert.equal(e.simulado,true);assert.match(e.hallazgos.at(-1)!.detalle,/SIMULADO/);
  assert.ok(!e.hallazgos.some(h=>h.resultado==='sin_sitio'));
  assert.equal(e.resultado_esperado.puntaje,80);
  assert.equal(e.resultado_esperado.decision,'bloquear');
  assert.deepEqual(e.resultado_esperado,calcularPuntaje(e.hallazgos));
  assert.deepEqual(e,JSON.parse(readFileSync('datos/fixtures/demo-presunto-giro-simulado.json','utf8')));
});
test('fuentes insuficientes fallan explícitamente, sin fabricar resultados oficiales',()=>{
  assert.throws(()=>generarDemo({...listas,sat69b:{...listas.sat69b,rfc:{}}}),/Snapshot insuficiente/);
});
