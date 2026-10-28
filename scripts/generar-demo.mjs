// Genera los datos de la demo a partir de las listas oficiales ya descargadas (npm run listas):
//  - public/demo/proveedores-demo.csv: 500 proveedores para la carga masiva.
//  - src/data/demo-semilla.json: 12 proveedores con los que arranca el modo demo.
// Los proveedores "limpios" son ficticios. Los casos de riesgo usan RFC y nombres REALES de los listados públicos del SAT;
// sus teléfonos, CLABE, montos y facturas son ficticios.
// Uso: npm run demo

import { readFileSync, writeFileSync } from "node:fs";

const b69 = JSON.parse(readFileSync("src/data/sat-69b.json", "utf8")).rfc;
const a69 = JSON.parse(readFileSync("src/data/sat-69.json", "utf8")).rfc;
const ofac = JSON.parse(readFileSync("src/data/ofac-sdn.json", "utf8")).entidades;

let semilla = 20261028;
const azar = () => ((semilla = (semilla * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const elegir = (arr) => arr[Math.floor(azar() * arr.length)];

function digitoClabe(base17) {
  const pesos = [3, 7, 1];
  let s = 0;
  for (let i = 0; i < 17; i++) s += (Number(base17[i]) * pesos[i % 3]) % 10;
  return String((10 - (s % 10)) % 10);
}
const BANCOS = ["002", "012", "014", "021", "072", "127", "137"];
function clabe() {
  let b = elegir(BANCOS) + "180";
  while (b.length < 17) b += Math.floor(azar() * 10);
  return b + digitoClabe(b);
}
const telefono = () => "+5255" + String(10000000 + Math.floor(azar() * 89999999));
const monto = () => Math.round((200_000 + azar() * 14_800_000) / 1000) * 1000;
const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ALFANUM = LETRAS + "0123456789";

const GIROS = [
  ["Harinas", "Harina de trigo y derivados"], ["Empaques", "Material de empaque y cartón"], ["Transportes", "Flete terrestre"],
  ["Lácteos", "Leche y derivados lácteos"], ["Azúcares", "Azúcar refinada"], ["Mantenimiento Industrial", "Mantenimiento de maquinaria"],
  ["Logística", "Almacenaje y distribución"], ["Plásticos", "Películas plásticas para empaque"], ["Refacciones", "Refacciones industriales"],
  ["Limpieza Industrial", "Servicios de limpieza"], ["Etiquetas", "Etiquetas y artes gráficas"], ["Combustibles", "Diésel y lubricantes"],
  ["Ingredientes", "Levaduras y aditivos alimentarios"], ["Tecnología", "Soporte de sistemas"], ["Seguridad Privada", "Vigilancia"],
];
const NOMBRES = ["del Bajío", "del Norte", "del Pacífico", "Mexicana", "Integral", "Hermanos Ruiz", "Santa Fe", "Azteca", "del Valle", "Peninsular", "Sierra Madre", "Altiplano", "del Golfo", "Occidente", "Anáhuac", "Tollan", "Cuauhtémoc", "La Laguna", "Huasteca", "Mixteca"];
const TIPOS = ["Comercializadora de", "Distribuidora de", "Grupo", "Servicios de", "Industrias de", "Proveedora de"];

const usados = new Set();
function rfcLimpio(nombre) {
  for (;;) {
    const ini = nombre.normalize("NFD").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 3).padEnd(3, "X");
    const yy = String(Math.floor(azar() * 25) + 0).padStart(2, "0");
    const mm = String(Math.floor(azar() * 12) + 1).padStart(2, "0");
    const dd = String(Math.floor(azar() * 28) + 1).padStart(2, "0");
    const homo = Array.from({ length: 3 }, () => elegir(ALFANUM)).join("");
    const rfc = `${ini}${yy}${mm}${dd}${homo}`;
    if (!b69[rfc] && !a69[rfc] && !usados.has(rfc)) { usados.add(rfc); return rfc; }
  }
}

function limpio(i) {
  const [sector, giro] = GIROS[i % GIROS.length];
  let nombre;
  do nombre = `${elegir(TIPOS)} ${sector} ${elegir(NOMBRES)} ${i}`; while (false);
  const razon = `${nombre.replace(/ \d+$/, "")} ${["SA de CV", "S de RL de CV", "SAPI de CV"][i % 3]}`;
  return { rfc: rfcLimpio(razon), razon_social: razon, giro };
}

function deLista(rfc, nombre, giro) {
  usados.add(rfc);
  return { rfc, razon_social: nombre, giro };
}

// Solo personas morales (RFC de 12 caracteres): no se usan nombres de personas físicas en la demo.
const porEstatus = (e) => Object.entries(b69).filter(([r, v]) => v[0] === e && r.length === 12);
const tomar = (lista, n) => Array.from({ length: n }, () => elegir(lista));

const riesgos = [
  ...tomar(porEstatus("presunto"), 10).map(([r, v]) => deLista(r, v[1], "Consultoría administrativa")),
  ...tomar(porEstatus("definitivo"), 6).map(([r, v]) => deLista(r, v[1], "Servicios de personal")),
  ...tomar(porEstatus("desvirtuado"), 4).map(([r, v]) => deLista(r, v[1], "Material de construcción")),
  ...tomar(porEstatus("sentencia_favorable"), 2).map(([r, v]) => deLista(r, v[1], "Publicidad")),
];
// Art. 69 (no localizados) que no estén en 69-B. Los nombres no vienen en el JSON compacto, así que se usa un nombre genérico.
const noLoc = Object.entries(a69).filter(([r, v]) => !b69[r] && v.some((x) => x[0] === "no_localizado") && /^[A-Z&Ñ]{3}\d/.test(r));
riesgos.push(...tomar(noLoc, 4).map(([r]) => deLista(r, `Contribuyente no localizado ${r}`, "Comercio al por mayor")));
// Homónimo de OFAC: nombre muy parecido (no idéntico) a una entidad real de la lista SDN.
const ent = ofac.filter((e) => e[2] === "entidad" && /S\.?A\.? DE C\.?V\.?/.test(e[1]) && e[1].length > 20);
const { normalizarNombre, similitud } = await import("../src/lib/verificacion/nombres.ts");
let base, homonimo;
do {
  base = elegir(ent)[1];
  // Cambia una vocal de la primera palabra larga: el nombre queda parecido, pero no idéntico.
  homonimo = base.replace(/([A-Z]{6,}?)([AEIOU])/, (m, a, v) => a + (v === "A" ? "E" : "A"));
  var sim = similitud(normalizarNombre(base), normalizarNombre(homonimo));
} while (homonimo === base || sim < 0.85 || sim >= 1);
riesgos.push({ rfc: rfcLimpio(homonimo), razon_social: homonimo, giro: "Comercio al por mayor" });

const filas = [];
let n = 0;
while (filas.length + riesgos.length < 500) filas.push(limpio(n++));
// Mezcla los casos de riesgo entre los limpios.
for (const r of riesgos) filas.splice(Math.floor(azar() * filas.length), 0, r);

const completos = filas.map((f, i) => ({
  ...f,
  sitio_web: "",
  telefono_registrado: telefono(),
  clabe: clabe(),
  monto_anual: monto(),
  factura_folio: `F-${(20000 + i * 7).toString()}`,
  factura_monto: Math.round(monto() / 12),
}));

const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const cols = ["rfc", "razon_social", "sitio_web", "telefono_registrado", "clabe", "giro_declarado", "monto_anual", "factura_folio", "factura_monto"];
const csv = [cols.join(","), ...completos.map((f) => cols.map((c) => esc(c === "giro_declarado" ? f.giro : f[c])).join(","))].join("\n");
writeFileSync("public/demo/proveedores-demo.csv", csv + "\n");

const enRiesgo = completos.filter((f) => riesgos.some((r) => r.rfc === f.rfc));
const semillaDemo = [...completos.filter((f) => !enRiesgo.includes(f)).slice(0, 6), enRiesgo.find((f) => b69[f.rfc]?.[0] === "presunto"), ...enRiesgo.filter((f) => b69[f.rfc]?.[0] === "presunto").slice(1, 2), enRiesgo.find((f) => b69[f.rfc]?.[0] === "definitivo"), enRiesgo.find((f) => b69[f.rfc]?.[0] === "desvirtuado"), enRiesgo.find((f) => f.razon_social.startsWith("Contribuyente no localizado")), enRiesgo.find((f) => f.razon_social === homonimo)]
  .filter(Boolean)
  .map((f) => ({ ...f, giro_declarado: f.giro, giro: undefined, sitio_web: null }));
writeFileSync("src/data/demo-semilla.json", JSON.stringify(semillaDemo, null, 2) + "\n");

console.log(`CSV: ${completos.length} proveedores (${riesgos.length} con alertas, incluido el homónimo "${homonimo}" de "${base}")`);
console.log(`Semilla: ${semillaDemo.length} proveedores`);
