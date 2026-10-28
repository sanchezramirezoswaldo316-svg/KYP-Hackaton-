import { readFile, writeFile, rename, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
export const ARCHIVOS = ['sat-69b.json','sat-69.json','ofac-sdn.json'];
// El directorio de respaldo es también el cerrojo visible para lectores.
export async function recuperar(dir, journal = path.resolve('datos/ulises-publicacion')) {
  let names;
  try { names = JSON.parse(await readFile(path.join(journal,'preparado.json'),'utf8')); }
  catch(e) { if(e.code === 'ENOENT') { await rm(journal,{recursive:true,force:true}); return; } throw e; }
  for(const name of names) await writeFile(path.join(dir,name),await readFile(path.join(journal,name)));
  await rm(journal,{recursive:true});
}
export async function publicar(dir, conjunto, antesDeRenombrar = async()=>{}, journal = path.resolve('datos/ulises-publicacion')) {
  const fechas = ARCHIVOS.map(n => conjunto[n]?.descargado_en);
  if (!fechas[0] || !fechas.every(f => f === fechas[0])) throw new Error('Conjunto incompleto o generaciones mezcladas');
  await mkdir(journal); // No apropiarse del bloqueo de otro escritor.
  try {
    for(const name of ARCHIVOS) {
      await writeFile(path.join(journal,name),await readFile(path.join(dir,name)));
      await writeFile(path.join(journal,`${name}.nuevo`),JSON.stringify(conjunto[name]));
    }
    await writeFile(path.join(journal,'preparado.tmp'),JSON.stringify(ARCHIVOS));
    await rename(path.join(journal,'preparado.tmp'),path.join(journal,'preparado.json'));
    for(const name of ARCHIVOS) { await antesDeRenombrar(name); await rename(path.join(journal,`${name}.nuevo`),path.join(dir,name)); }
    await writeFile(path.join(journal,'..','ulises-generacion.json'),JSON.stringify({generacion:conjunto[ARCHIVOS[0]].descargado_en}));
    await rm(journal,{recursive:true});
  } catch(e) {
    await recuperar(dir, journal);
    throw e;
  }
}
