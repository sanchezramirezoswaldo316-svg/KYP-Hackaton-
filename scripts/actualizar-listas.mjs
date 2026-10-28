// Descarga las listas oficiales y genera los archivos compactos de src/data/.
// Uso: npm run listas
// Fuentes: SAT (Art. 69-B y Art. 69 del CFF) y OFAC (lista SDN del Tesoro de EE. UU.).

import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";

const SAT = "http://omawww.sat.gob.mx/cifras_sat/Documents";
const FUENTES = {
  sat69b: `${SAT}/Listado_Completo_69-B.csv`,
  sat69: [
    { supuesto: "no_localizado", url: `${SAT}/No%20localizados.csv` },
    { supuesto: "exigible", url: `${SAT}/Exigibles.csv` },
    { supuesto: "sentencia", url: `${SAT}/Sentencias.csv` },
  ],
  ofac: "https://www.treasury.gov/ofac/downloads/sdn.csv",
};

const MESES = { enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06", julio: "07", agosto: "08", septiembre: "09", octubre: "10", noviembre: "11", diciembre: "12" };

async function descargar(url, encoding) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} respondió ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  return {
    texto: new TextDecoder(encoding).decode(bytes),
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

// Parser CSV mínimo con soporte de comillas.
function parseCsv(texto) {
  const filas = [];
  let fila = [], campo = "", comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === ",") { fila.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fila.push(campo); filas.push(fila); fila = []; campo = "";
    } else campo += c;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  return filas;
}

// "31/12/2025" → "2025-12-31"
function fechaIso(dmy) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((dmy ?? "").trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

async function sat69b() {
  const { texto, sha256 } = await descargar(FUENTES.sat69b, "latin1");
  const filas = parseCsv(texto);
  const m = /actualizada al (\d{1,2}) de (\w+) de (\d{4})/i.exec(filas[0]?.[0] ?? "");
  const actualizacion = m ? `${m[3]}-${MESES[m[2].toLowerCase()]}-${m[1].padStart(2, "0")}` : null;
  const inicio = filas.findIndex((f) => f[1] === "RFC") + 1;
  const ESTATUS = { "Presunto": ["presunto", 7], "Desvirtuado": ["desvirtuado", 11], "Definitivo": ["definitivo", 15], "Sentencia Favorable": ["sentencia_favorable", 19] };
  const rfc = {};
  for (const f of filas.slice(inicio)) {
    const e = ESTATUS[f[3]?.trim()];
    if (!f[1] || !e) continue;
    rfc[f[1].trim().toUpperCase()] = [e[0], f[2].trim(), fechaIso(f[e[1]]) ?? fechaIso(f[7])];
  }
  return { fuente: "SAT · Listado completo Art. 69-B CFF", url: FUENTES.sat69b, actualizacion, sha256, registros: Object.keys(rfc).length, rfc };
}

async function sat69() {
  const listas = [];
  const rfc = {};
  for (const { supuesto, url } of FUENTES.sat69) {
    const { texto, sha256 } = await descargar(url, "latin1");
    const filas = parseCsv(texto).slice(1).filter((f) => f[0]);
    for (const f of filas) {
      const clave = f[0].trim().toUpperCase();
      const entrada = [supuesto, fechaIso(f[4])];
      rfc[clave] ??= [];
      if (!rfc[clave].some((x) => x[0] === supuesto)) rfc[clave].push(entrada);
    }
    listas.push({ supuesto, url, sha256, registros: filas.length });
  }
  return { fuente: "SAT · Listados Art. 69 CFF", listas, registros: Object.keys(rfc).length, rfc };
}

async function ofac() {
  const { texto, sha256 } = await descargar(FUENTES.ofac, "utf-8");
  const entidades = [];
  for (const f of parseCsv(texto)) {
    const tipo = (f[2] ?? "").trim();
    if (!f[1] || tipo === "vessel" || tipo === "aircraft") continue;
    entidades.push([Number(f[0]), f[1].trim(), tipo === "individual" ? "persona" : "entidad", (f[3] ?? "").trim()]);
  }
  return { fuente: "OFAC · Specially Designated Nationals (SDN)", url: FUENTES.ofac, sha256, registros: entidades.length, entidades };
}

const descargado_en = new Date().toISOString();
const [b, a, o] = await Promise.all([sat69b(), sat69(), ofac()]);
await writeFile("src/data/sat-69b.json", JSON.stringify({ ...b, descargado_en }));
await writeFile("src/data/sat-69.json", JSON.stringify({ ...a, descargado_en }));
await writeFile("src/data/ofac-sdn.json", JSON.stringify({ ...o, descargado_en }));
console.log(`69-B: ${b.registros} RFC (actualizado ${b.actualizacion})`);
console.log(`Art. 69: ${a.registros} RFC`);
console.log(`OFAC SDN: ${o.registros} registros`);
