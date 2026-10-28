import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { generarDemo, SEMILLA } from './ulises/demo.mjs';
function main(){
  if(existsSync('datos/ulises-publicacion'))throw new Error('Listas en publicación: recuperar/terminar antes de generar demo');
  const leer=n=>JSON.parse(readFileSync(`src/data/${n}.json`,'utf8'));
  const d=generarDemo({sat69b:leer('sat-69b'),sat69:leer('sat-69'),ofac:leer('ofac-sdn')},{semilla:Number(process.env.KYP_DEMO_SEMILLA??SEMILLA),generado_en:process.env.KYP_DEMO_FECHA??'2026-10-28T00:00:00Z'});
  // Generación y validación completa antes de escribir los artefactos.
  writeFileSync('public/demo/proveedores-demo.csv',d.csv);
  writeFileSync('src/data/demo-semilla.json',JSON.stringify(d.semilla,null,2)+'\n');
  writeFileSync('datos/demo-manifiesto.json',JSON.stringify(d.manifiesto,null,2)+'\n');
  writeFileSync('datos/fixtures/demo-presunto-giro-simulado.json',JSON.stringify(d.escena,null,2)+'\n');
  console.log(JSON.stringify(d.manifiesto.conteos));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main();
