import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, writeFile, readFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { importarSat, agrupar69, fechaIso, parseCsv } from '../../../scripts/ulises/sat.mjs';
import { publicar, recuperar, ARCHIVOS } from '../../../scripts/ulises/publicacion.mjs';
import { descargar } from '../../../scripts/actualizar-listas.mjs';
import { consultar69, consultar69B } from './listas-core.ts';
const b = readFileSync('datos/fixtures/sat/69b.csv');
const a = readFileSync('datos/fixtures/sat/69-latin1.csv');
const opciones = {tipo:'69b', url:'http://omawww.sat.gob.mx/fixture',descargado_en:'2026-10-28T00:00:00Z'};
const parse = (text: string) => importarSat(Buffer.from(text),opciones);

test('BOM, comas, multilinea, cuatro estatus, hash de bytes y publicación separada',()=>{
  const d=importarSat(b,opciones);
  assert.equal(d.registros,4);
  assert.equal(d.actualizacion,'2025-12-31');
  assert.equal(d.descargado_en,opciones.descargado_en);
  assert.equal(d.sha256,createHash('sha256').update(b).digest('hex'));
  assert.deepEqual(Object.values(d.rfc).map((x: unknown)=> (x as string[])[0]),['presunto','definitivo','desvirtuado','sentencia_favorable']);
  assert.match(d.rfc.AAA010101AAA[1],/,.*\n/s);
  assert.equal(consultar69B(d,' aaa010101aaa ').resultado,'presunto');
});
test('latin1 y agrupación sin duplicados de varias causas',()=>{
  const listas=['no_localizado','exigible','sentencia'].map(supuesto=>({...importarSat(a,{...opciones,tipo:'69',supuesto}),supuesto}));
  assert.equal(listas[0].sha256,createHash('sha256').update(a).digest('hex'));
  const d=agrupar69([...listas,listas[0]]);
  assert.equal(d.rfc.AAA010101AAA.length,3);
  assert.match(consultar69(d,' aaa010101aaa ').detalle,/no localizado/);
});
test('CSV inválido, HTML, encabezados y calendario se rechazan',()=>{
  for(const text of ['', '<html>Error</html>', '"sin cerrar', 'a"b,c', '"a"x,b']) assert.throws(()=>parseCsv(text));
  for(const date of ['31/02/2024','29/02/2025','01/13/2025','2025-01-01']) assert.throws(()=>fechaIso(date));
  assert.equal(fechaIso('29/02/2024'),'2024-02-29');
  const text=b.toString('utf8');
  for(const text2 of [text.replace('RFC','Identificador'),text.replace('Situación del contribuyente','Estado'),text.replace('Presunto','Otro'),text.replace('01/01/2020','31/02/2020')]) assert.throws(()=>parse(text2));
});
test('columnas reordenadas se resuelven por nombre',()=>{
  const rows=parseCsv(b.toString('utf8'));
  const esc=(x:string)=>`"${x.replaceAll('"','""')}"`;
  const text=[rows[0].map(esc).join(','),...rows.slice(1).map((r:string[])=>r.reverse().map(esc).join(','))].join('\n');
  assert.deepEqual(parse(text).rfc,importarSat(b,opciones).rfc);
});
test('duplicados exactos, sentencia posterior, ambigüedad y no usar presunción como DOF definitivo',()=>{
  const rows=parseCsv(b.toString('utf8'));
  const esc=(x:string)=>`"${x.replaceAll('"','""')}"`;
  const csv=(rs:string[][])=>rs.map(r=>r.map(esc).join(',')).join('\n');
  const primero=rows[4].slice(); // desvirtuado
  const posterior=rows[5].slice(); posterior[0]=primero[0]; posterior[1]=primero[1];
  const d=parse(csv([rows[1],posterior,primero,posterior]));
  assert.equal(d.rfc[primero[0]][0],'sentencia_favorable');
  assert.deepEqual(d.rfc,parse(csv([rows[1],primero,posterior])).rfc);
  assert.equal(d.conteos.duplicados,1);
  posterior[6]=primero[4];
  assert.throws(()=>parse(csv([rows[1],primero,posterior])),/Ambigüedad/);
  const definitivo=rows[3].slice(); definitivo[5]='';
  assert.equal(parse(csv([rows[1],definitivo])).rfc[definitivo[0]][2],null);
});
test('descarga explicita errores y timeout sin red',async()=>{
  for(const respuesta of [new Response('<html>error</html>',{headers:{'content-type':'text/html'}}),new Response('',{status:503}),new Response('')]) {
    await assert.rejects(descargar('fixture',async()=>respuesta),/Descarga fallida/);
  }
  await assert.rejects(descargar('fixture',async(_u:unknown,o:{signal:AbortSignal})=>new Promise((_resolve,reject)=>{
    o.signal.addEventListener('abort',()=>reject(o.signal.reason));
    setTimeout(()=>reject(new Error('fin de prueba')),50);
  }),1),/Descarga fallida/);
});
test('publicación fallida recupera todos los bytes; recuperación idempotente',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'sat-'));
  const journal=path.join(dir,'respaldo');
  try {
    for(const name of ARCHIVOS) await writeFile(path.join(dir,name),'original');
    const conjunto=Object.fromEntries(ARCHIVOS.map(n=>[n,{descargado_en:'nueva'}]));
    await assert.rejects(publicar(dir,conjunto,async(n:string)=>{if(n===ARCHIVOS[1]) throw new Error('fallo inyectado');},journal));
    for(const name of ARCHIVOS) assert.equal(await readFile(path.join(dir,name),'utf8'),'original');
    await recuperar(dir,journal);
    // Simular interrupción posterior al respaldo preparado y escritura parcial.
    await mkdir(journal);
    for(const name of ARCHIVOS) await writeFile(path.join(journal,name),'original');
    await writeFile(path.join(journal,'preparado.json'),JSON.stringify({version:2,archivos:ARCHIVOS,marcador:null}));
    await writeFile(path.join(dir,ARCHIVOS[0]),'parcial');
    await recuperar(dir,journal);
    for(const name of ARCHIVOS) assert.equal(await readFile(path.join(dir,name),'utf8'),'original');
    await publicar(dir,conjunto,undefined,journal);
    for(const name of ARCHIVOS) assert.equal(JSON.parse(await readFile(path.join(dir,name),'utf8')).descargado_en,'nueva');
  } finally { await rm(dir,{recursive:true,force:true}); }
});

test('rechazos incluyen conteos y causas; no elegir por gravedad ni fila',()=>{
  try { parse(b.toString('utf8').replace('Presunto','Situación nueva')); assert.fail('Debe rechazar'); }
  catch(e) { assert.match((e as Error).message,/"rechazados":1/); assert.match((e as Error).message,/Estatus desconocido/); }
  const rows=parseCsv(b.toString('utf8'));
  const csv=(rs:string[][])=>rs.map(r=>r.map(x=>`"${x.replaceAll('"','""')}"`).join(',')).join('\n');
  const definitivo=rows[3].slice(); const sentencia=rows[5].slice();
  sentencia[0]=definitivo[0]; sentencia[1]=definitivo[1];
  for(const rs of [[definitivo,sentencia],[sentencia,definitivo]]) assert.equal(parse(csv([rows[1],...rs])).rfc[definitivo[0]][0],'sentencia_favorable');
  sentencia[6]='';
  assert.throws(()=>parse(csv([rows[1],definitivo,sentencia])),/Ambigüedad/);
  definitivo[6]='01/01/2023';
  assert.throws(()=>parse(csv([rows[1],definitivo])),/evento posterior/);
});

test('manifiesto SHA-256 de fixtures corresponde a bytes en disco',()=>{
  const hashes=JSON.parse(readFileSync('datos/fixtures/sat/sha256.json','utf8'));
  for(const [name,hash] of Object.entries(hashes)) assert.equal(createHash('sha256').update(readFileSync(`datos/fixtures/sat/${name}`)).digest('hex'),hash);
});

test('lector frío no acepta conjunto bloqueado y caché conserva generación íntegra',async()=>{
  const { spawnSync } = await import('node:child_process');
  const { pathToFileURL } = await import('node:url');
  const dir=await mkdtemp(path.join(tmpdir(),'sat-lector-'));
  try {
    await mkdir(path.join(dir,'src','data'),{recursive:true});
    await mkdir(path.join(dir,'datos'));
    for(const name of ARCHIVOS) await writeFile(path.join(dir,'src','data',name),readFileSync(`src/data/${name}`));
    const modulo=pathToFileURL(path.resolve('src/lib/verificacion/listas.ts')).href;
    await mkdir(path.join(dir,'datos','ulises-publicacion'));
    const bloqueado=spawnSync(process.execPath,['--input-type=module','-e',`import {revisar69B} from ${JSON.stringify(modulo)}; revisar69B('AAA010101AAA');`],{cwd:dir,encoding:'utf8'});
    assert.notEqual(bloqueado.status,0);
    assert.match(bloqueado.stderr,/Listas en publicación/);
    await rm(path.join(dir,'datos','ulises-publicacion'),{recursive:true});
    const estable=spawnSync(process.execPath,['--input-type=module','-e',`import assert from 'node:assert/strict'; import fs from 'node:fs'; import {revisar69B,revisar69,infoListas} from ${JSON.stringify(modulo)}; const antes=infoListas(); const h=revisar69B('AAA010101AAA'); fs.writeFileSync('src/data/sat-69.json','inválido'); assert.deepEqual(infoListas(),antes); assert.deepEqual(revisar69B(' aaa010101aaa '),h); revisar69('AAA010101AAA');`],{cwd:dir,encoding:'utf8'});
    assert.equal(estable.status,0,estable.stderr);
  } finally { await rm(dir,{recursive:true,force:true}); }
});

for (const anterior of [null, '{ "generacion": "anterior", "extra": true }\n']) {
  test(`fallo tras publicar marcador restaura listas y marcador ${anterior === null ? 'ausente' : 'byte a byte'}`, async () => {
    const raiz = await mkdtemp(path.join(tmpdir(), 'sat-marcador-'));
    const dir = path.join(raiz, 'listas');
    const journal = path.join(raiz, 'respaldo');
    const marca = path.join(raiz, 'ulises-generacion.json');
    try {
      await mkdir(dir);
      for (const name of ARCHIVOS) await writeFile(path.join(dir, name), 'original');
      if (anterior !== null) await writeFile(marca, anterior);
      const conjunto = Object.fromEntries(ARCHIVOS.map(n => [n, {descargado_en:'nueva'}]));
      await assert.rejects(publicar(dir, conjunto, undefined, journal, async () => {
        assert.equal(JSON.parse(await readFile(marca, 'utf8')).generacion, 'nueva');
        throw new Error('caída después del marcador');
      }), /caída después del marcador/);
      for (const name of ARCHIVOS) assert.equal(await readFile(path.join(dir, name), 'utf8'), 'original');
      if (anterior === null) await assert.rejects(readFile(marca), {code:'ENOENT'});
      else assert.equal(await readFile(marca, 'utf8'), anterior);
      await assert.rejects(readFile(path.join(journal, 'preparado.json')), {code:'ENOENT'});
      await recuperar(dir, journal);
      // Simular caída abrupta: quedan journal preparado, listas y marcador nuevos.
      await mkdir(journal);
      for (const name of ARCHIVOS) {
        await writeFile(path.join(journal, name), 'original');
        await writeFile(path.join(dir, name), 'nuevo');
      }
      await writeFile(path.join(journal, 'preparado.json'), JSON.stringify({
        version:2, archivos:ARCHIVOS, marcador:anterior === null ? null : Buffer.from(anterior).toString('base64'),
      }));
      await writeFile(marca, '{"generacion":"nueva"}');
      await recuperar(dir, journal);
      await recuperar(dir, journal);
      for (const name of ARCHIVOS) assert.equal(await readFile(path.join(dir, name), 'utf8'), 'original');
      if (anterior === null) await assert.rejects(readFile(marca), {code:'ENOENT'});
      else assert.equal(await readFile(marca, 'utf8'), anterior);
      await publicar(dir, conjunto, undefined, journal);
      assert.equal(JSON.parse(await readFile(marca, 'utf8')).generacion, 'nueva');
      for (const name of ARCHIVOS) assert.equal(JSON.parse(await readFile(path.join(dir, name), 'utf8')).descargado_en, 'nueva');
    } finally { await rm(raiz, {recursive:true, force:true}); }
  });
}

test('respaldo antiguo sin marcador conserva bloqueo y archivos para recuperación manual', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'sat-journal-antiguo-'));
  const journal = path.join(dir, 'respaldo');
  try {
    await mkdir(journal);
    for (const name of ARCHIVOS) await writeFile(path.join(dir, name), 'sin tocar');
    await writeFile(path.join(journal, 'preparado.json'), JSON.stringify(ARCHIVOS));
    await assert.rejects(recuperar(dir, journal), /antiguo o inválido/);
    for (const name of ARCHIVOS) assert.equal(await readFile(path.join(dir, name), 'utf8'), 'sin tocar');
    assert.deepEqual(JSON.parse(await readFile(path.join(journal, 'preparado.json'), 'utf8')), ARCHIVOS);
  } finally { await rm(dir, {recursive:true, force:true}); }
});
