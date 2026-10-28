import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexarOfac, consultarOfac, UMBRAL_HOMONIMO, type DatosOfac } from './listas-core.ts';
import { normalizarNombre, similitud } from './nombres.ts';
import { calcularPuntaje } from '../puntaje/reglas.ts';
const dato = (entidades: DatosOfac['entidades']): DatosOfac => ({sha256:'fixture',descargado_en:'2026-10-28T00:00:00Z',registros:entidades.length,entidades});
const buscar=(nombre:string,consulta:string)=>consultarOfac(indexarOfac(dato([[306,nombre,'entidad','CUBA']])),consulta);

test('regresión TRANSPORTES/TRANSPORTEZ sin tokens comunes: Dice .90 y parecido',()=>{
  assert.equal(similitud('TRANSPORTES','TRANSPORTEZ'),.9);
  const h=buscar('TRANSPORTES','TRANSPORTEZ');
  assert.equal(h.resultado,'coincidencia_parecida');
  assert.match(h.detalle,/SDN #306, programa CUBA/);
  assert.equal(h.evidencia_url,'https://sanctionssearch.ofac.treas.gov/Details.aspx?id=306');
  assert.equal(calcularPuntaje([h]).puntaje,25);
  assert.equal(calcularPuntaje([h]).bloqueo_directo,false);
});
test('Dice 1 no implica igualdad canónica; exacta real tiene prioridad',()=>{
  assert.equal(similitud('ABC DEF XYZ','ABCDEF XYZ'),1);
  assert.equal(buscar('ABC DEF XYZ','ABCDEF XYZ').resultado,'coincidencia_parecida');
  const d=dato([[1,'ABC DEF XYZ','entidad','A'],[2,'ABCDEF XYZ','entidad','B']]);
  const h=consultarOfac(indexarOfac(d),'ABCDEF XYZ');
  assert.equal(h.resultado,'coincidencia_exacta');
  assert.match(h.detalle,/SDN #2/);
});
test('igualdad real, iniciales cortas, puntuación, acentos y formas societarias',()=>{
  for(const s of ['Transportes Águila, S.A. de C.V.','Transportes Aguila SA de CV','Transportes Aguila SA de C.V.']) {
    assert.equal(normalizarNombre(s),'TRANSPORTES AGUILA');
    assert.equal(buscar('TRANSPORTES AGUILA',s).resultado,'coincidencia_exacta');
  }
  for(const s of ['S de RL de CV','S. de R.L. de C.V.','SAPI de CV','S.A.P.I. de C.V.','LLC']) assert.equal(normalizarNombre(`Águila ${s}`),'AGUILA');
  assert.equal(buscar('A','A').resultado,'coincidencia_exacta');
  assert.match(buscar('Águila','AGUILA').detalle,/Identidad no confirmada/);
  assert.equal(calcularPuntaje([buscar('Águila','AGUILA')]).bloqueo_directo,true);
});
test('vacíos y solo sufijos no generan coincidencia ni siquiera entre sí',()=>{
  for(const a of ['', ' ', 'S.A. de C.V.', 'LLC','---']) for(const b of ['', 'S.A. de C.V.','LLC']) assert.equal(buscar(a,b).resultado,'sin_coincidencia');
  assert.equal(similitud('',''),0);
});
test('no eliminar palabras internas, artículos, iniciales ni Ñ',()=>{
  for(const [a,b] of [['A TRANSPORTES','B TRANSPORTES'],['BANCO DE CUBA','BANCO CUBA'],['LOS CUINIS','CUINIS'],['PEÑA','PENA'],['THE COMPANY','COMPANY'],['SA INDUSTRIAL','INDUSTRIAL']]) {
    assert.notEqual(normalizarNombre(a),normalizarNombre(b));
    assert.notEqual(buscar(a,b).resultado,'coincidencia_exacta');
  }
});
test('homónimo, negativo claro y umbral conservado',()=>{
  assert.equal(UMBRAL_HOMONIMO,.82);
  assert.equal(buscar('BANCO NACIONAL DE CUBA','Banco Nacional de Cubas SA').resultado,'coincidencia_parecida');
  assert.equal(buscar('TRANSPORTES','ZXQ 987654').resultado,'sin_coincidencia');
});
test('desempate determinista por ID, nombre y programa, sin alterar datos',()=>{
  const entidades: DatosOfac['entidades']=[[4,'TRANSPORTES','entidad','Z'],[2,'TRANSPORTES','entidad','Z'],[2,'TRANSPORTES','entidad','A'],[1,'OTRO','entidad','X']];
  for(const q of ['TRANSPORTEZ','TRANSPORTES','OTRO','NEGATIVO']) {
    const esperado=consultarOfac(indexarOfac(dato(entidades)),q);
    for(let i=0;i<entidades.length;i++) assert.deepEqual(consultarOfac(indexarOfac(dato([...entidades.slice(i),...entidades.slice(0,i)].reverse())),q),esperado);
  }
  assert.match(consultarOfac(indexarOfac(dato(entidades)),'TRANSPORTEZ').detalle,/SDN #2, programa A/);
});
test('índice aproximado equivale a barrido Dice para variantes del fixture',()=>{
  const nombres=['TRANSPORTES','ABC DEF XYZ','ABCDEF XYZ','BANCO NACIONAL DE CUBA','A','PEÑA',''];
  const indice=indexarOfac(dato(nombres.map((n,i)=>[i+1,n,'entidad','TEST'])));
  for(const q of ['TRANSPORTEZ','TRANZPORTES','BANCO NACIONAL DE CUBAS','ABCDEF XYZ','A','', 'XYZZZZ']) {
    const n=normalizarNombre(q);
    const exacta=!!n && nombres.some(s=>normalizarNombre(s)===n);
    const parecida=!!n && nombres.some(s=>similitud(n,normalizarNombre(s))>=UMBRAL_HOMONIMO);
    assert.equal(consultarOfac(indice,q).resultado,exacta?'coincidencia_exacta':parecida?'coincidencia_parecida':'sin_coincidencia');
  }
});
