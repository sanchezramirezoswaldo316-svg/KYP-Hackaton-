import { createHash } from 'node:crypto';
import { importarSat, agrupar69, parseCsv } from './ulises/sat.mjs';
import { publicar, recuperar } from './ulises/publicacion.mjs';
const SAT = 'http://omawww.sat.gob.mx/cifras_sat/Documents';
const descargado_en = new Date().toISOString();
export async function descargar(url, fetcher = fetch, timeout = 30000) {
  try {
    const res = await fetcher(url,{signal:AbortSignal.timeout(timeout)});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (/html/i.test(res.headers.get('content-type') ?? '')) throw new Error('Respuesta HTML');
    const bytes = Buffer.from(await res.arrayBuffer());
    if (!bytes.length) throw new Error('Archivo vacío');
    return bytes;
  } catch(e) { throw new Error(`Descarga fallida ${url}: ${e.message}`,{cause:e}); }
}
async function main() {
  if (process.argv.includes('--recuperar')) { await recuperar('src/data'); return; }
  const url = `${SAT}/Listado_Completo_69-B.csv`;
  const b = importarSat(await descargar(url),{tipo:'69b',url,descargado_en});
  const listas = [];
  for(const [supuesto,nombre] of [['no_localizado','No%20localizados'],['exigible','Exigibles'],['sentencia','Sentencias']]) {
    const url = `${SAT}/${nombre}.csv`;
    listas.push({...importarSat(await descargar(url),{tipo:'69',supuesto,url,descargado_en}),supuesto});
  }
  const a = agrupar69(listas);
  const ofacUrl = 'https://www.treasury.gov/ofac/downloads/sdn.csv';
  const bytes = await descargar(ofacUrl);
  const entidades = [];
  for(const row of parseCsv(new TextDecoder('utf-8',{fatal:true}).decode(bytes))) {
    if(row.length !== 12 || !/^\d+$/.test(row[0]) || !row[1]?.trim()) throw new Error('Estructura OFAC inválida');
    const tipo=row[2].trim();
    if(tipo === 'vessel' || tipo === 'aircraft') continue;
    entidades.push([Number(row[0]),row[1].trim(),tipo === 'individual'?'persona':'entidad',row[3].trim()]);
  }
  if(!entidades.length) throw new Error('OFAC sin registros');
  const o = {fuente:'OFAC · SDN',url:ofacUrl,sha256:createHash('sha256').update(bytes).digest('hex'),descargado_en,registros:entidades.length,entidades};
  await publicar('src/data',{'sat-69b.json':b,'sat-69.json':a,'ofac-sdn.json':o});
  console.log(JSON.stringify({sat69b:b.conteos,sat69:a.listas.map(x=>({supuesto:x.supuesto,...x.conteos})),ofac:o.registros}));
}
// Importar helpers o el descargador en pruebas nunca ejecuta la actualización.
import { pathToFileURL } from 'node:url';
if(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e=>{ console.error(e.message); process.exitCode=1; });
