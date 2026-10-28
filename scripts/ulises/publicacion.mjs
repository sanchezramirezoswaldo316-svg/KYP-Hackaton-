import { readFile, writeFile, rename, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
export const ARCHIVOS = ['sat-69b.json','sat-69.json','ofac-sdn.json'];
const MARCADOR = 'ulises-generacion.json';
async function marcadorAnterior(journal) {
  try { return (await readFile(path.join(journal,'..',MARCADOR))).toString('base64'); }
  catch (e) { if (e.code === 'ENOENT') return null; throw e; }
}
async function escribirMarcador(journal, bytes) {
  // El temporal y el destino comparten filesystem; nunca publicar bytes parciales.
  const temporal = path.join(journal,'marcador.tmp');
  await writeFile(temporal,bytes);
  await rename(temporal,path.join(journal,'..',MARCADOR));
}
// El directorio de respaldo es también el cerrojo visible para lectores.
export async function recuperar(dir, journal = path.resolve('datos/ulises-publicacion')) {
  let preparado;
  try { preparado = JSON.parse(await readFile(path.join(journal,'preparado.json'),'utf8')); }
  catch(e) { if(e.code === 'ENOENT') { await rm(journal,{recursive:true,force:true}); return; } throw e; }
  // Un respaldo antiguo no permite conocer los bytes ni la ausencia del marcador anterior.
  // Mantener el bloqueo y las copias para una recuperación manual, sin inventar versión.
  if (preparado?.version !== 2 || !Array.isArray(preparado.archivos) ||
      preparado.archivos.length !== ARCHIVOS.length ||
      !ARCHIVOS.every((name,i) => preparado.archivos[i] === name) ||
      !(preparado.marcador === null || typeof preparado.marcador === 'string')) {
    throw new Error('Respaldo de publicación antiguo o inválido: conservar bloqueo y recuperar manualmente');
  }
  // Leer todas las copias antes de modificar destinos. Si falla, conservar el journal.
  const originales = await Promise.all(ARCHIVOS.map(name => readFile(path.join(journal,name))));
  for(const [i,name] of ARCHIVOS.entries()) await writeFile(path.join(dir,name),originales[i]);
  if (preparado.marcador === null) {
    await rm(path.join(journal,'..',MARCADOR),{force:true});
  } else {
    await escribirMarcador(journal,Buffer.from(preparado.marcador,'base64'));
  }
  // Solo desbloquear después de recuperar tanto listas como marcador.
  await rm(journal,{recursive:true});
}
/**
 * @param {string} dir
 * @param {Record<string, { descargado_en: string }>} conjunto
 * @param {(nombre: string) => Promise<void>} [antesDeRenombrar]
 * @param {string} [journal]
 * @param {() => Promise<void>} [despuesDeMarcar]
 */
export async function publicar(dir, conjunto, antesDeRenombrar = async()=>{}, journal = path.resolve('datos/ulises-publicacion'), despuesDeMarcar = async()=>{}) {
  const fechas = ARCHIVOS.map(n => conjunto[n]?.descargado_en);
  if (!fechas[0] || !fechas.every(f => f === fechas[0])) throw new Error('Conjunto incompleto o generaciones mezcladas');
  await mkdir(journal); // No apropiarse del bloqueo de otro escritor.
  try {
    const marcador = await marcadorAnterior(journal);
    for(const name of ARCHIVOS) {
      await writeFile(path.join(journal,name),await readFile(path.join(dir,name)));
      await writeFile(path.join(journal,`${name}.nuevo`),JSON.stringify(conjunto[name]));
    }
    await writeFile(path.join(journal,'preparado.tmp'),JSON.stringify({version:2,archivos:ARCHIVOS,marcador}));
    await rename(path.join(journal,'preparado.tmp'),path.join(journal,'preparado.json'));
    for(const name of ARCHIVOS) { await antesDeRenombrar(name); await rename(path.join(journal,`${name}.nuevo`),path.join(dir,name)); }
    await escribirMarcador(journal,JSON.stringify({generacion:conjunto[ARCHIVOS[0]].descargado_en}));
    await despuesDeMarcar(); // Permite comprobar la ventana posterior al marcador sin red.
    await rm(journal,{recursive:true});
  } catch(e) {
    await recuperar(dir, journal);
    throw e;
  }
}
