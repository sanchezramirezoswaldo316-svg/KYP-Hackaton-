// Ejecuta con: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularPuntaje } from "./reglas.ts";

test("proveedor limpio se libera", () => {
  const r = calcularPuntaje([{ fuente: "sat_69b", resultado: "sin_coincidencia", detalle: "", fecha_fuente: null }]);
  assert.equal(r.decision, "liberar");
  assert.equal(r.puntaje, 0);
});

test("69-B definitivo bloquea directo", () => {
  const r = calcularPuntaje([{ fuente: "sat_69b", resultado: "definitivo", detalle: "", fecha_fuente: null }]);
  assert.equal(r.decision, "bloquear");
  assert.equal(r.bloqueo_directo, true);
});

test("69-B presunto va a revisión", () => {
  const r = calcularPuntaje([{ fuente: "sat_69b", resultado: "presunto", detalle: "", fecha_fuente: null }]);
  assert.equal(r.decision, "revisar");
  assert.equal(r.puntaje, 60);
});

test("desvirtuado no penaliza", () => {
  const r = calcularPuntaje([{ fuente: "sat_69b", resultado: "desvirtuado", detalle: "", fecha_fuente: null }]);
  assert.equal(r.decision, "liberar");
});

test("presunto + giro no coincide supera 60 y se bloquea", () => {
  const r = calcularPuntaje([
    { fuente: "sat_69b", resultado: "presunto", detalle: "", fecha_fuente: null },
    { fuente: "web", resultado: "giro_no_coincide", detalle: "", fecha_fuente: null },
  ]);
  assert.equal(r.puntaje, 80);
  assert.equal(r.decision, "bloquear");
});

test("homónimo OFAC solo pide revisión", () => {
  const r = calcularPuntaje([{ fuente: "ofac", resultado: "coincidencia_parecida", detalle: "", fecha_fuente: null }]);
  assert.equal(r.decision, "revisar");
});

// Expectativas explícitas del PDF: no se derivan del catálogo de implementación.
const casos = [
  ["sat_69b", "definitivo", 100, "bloquear", true, "69b_definitivo"],
  ["sat_69b", "presunto", 60, "revisar", false, "69b_presunto"],
  ["sat_69b", "desvirtuado", 0, "liberar", false, "69b_desvirtuado"],
  ["sat_69b", "sentencia_favorable", 0, "liberar", false, "69b_sentencia"],
  ["sat_69", "listado", 30, "revisar", false, "69_listado"],
  ["ofac", "coincidencia_exacta", 100, "bloquear", true, "ofac_exacta"],
  ["ofac", "coincidencia_parecida", 25, "revisar", false, "ofac_parecida"],
  ["web", "giro_no_coincide", 20, "liberar", false, "web_giro"],
  ["web", "sin_sitio", 10, "liberar", false, "web_sin_sitio"],
  ["noticias", "noticias_negativas", 15, "liberar", false, "noticias"],
  ["dominio", "dominio_reciente", 10, "liberar", false, "dominio_reciente"],
] as const;

function hallazgo(fuente: import("../tipos.ts").Fuente, resultado: string): import("../tipos.ts").Hallazgo {
  return { fuente, resultado, detalle: "Evidencia de prueba", fecha_fuente: "2026-10-28" };
}

for (const [fuente, resultado, puntos, decision, bloqueo, regla] of casos) {
  test(`regla PDF ${fuente}/${resultado}: ${puntos} puntos`, () => {
    const r = calcularPuntaje([hallazgo(fuente, resultado)]);
    assert.equal(r.puntaje, puntos);
    assert.equal(r.decision, decision);
    assert.equal(r.bloqueo_directo, bloqueo);
    assert.equal(r.motivos.length, 1);
    assert.equal(r.motivos[0].regla, regla);
    assert.equal(r.motivos[0].puntos, puntos);
    assert.ok(r.motivos[0].descripcion.length > 0);
  });

  test(`copias y evidencias distintas aplican una sola vez ${regla}`, () => {
    const h = hallazgo(fuente, resultado);
    assert.deepEqual(calcularPuntaje([h, { ...h }, {
      ...h, detalle: "Otra evidencia", fecha_fuente: "2026-10-27", evidencia_url: "https://example.test/evidencia",
    }]), calcularPuntaje([h]));
  });
}

test("regresión: tres SAT 69/listado dan 30, un motivo y revisión", () => {
  const h = hallazgo("sat_69", "listado");
  const r = calcularPuntaje([h, { ...h }, { ...h }]);
  assert.equal(r.puntaje, 30);
  assert.equal(r.decision, "revisar");
  assert.equal(r.bloqueo_directo, false);
  assert.equal(r.motivos.length, 1);
});

// Todos los pesos son múltiplos de 5: 21 y 61 no son construibles.
// Se prueban 20/25 y 60/65, los valores alcanzables adyacentes a los umbrales.
for (const [nombre, entradas, puntos, decision] of [
  ["debajo de 20", [hallazgo("noticias", "noticias_negativas")], 15, "liberar"],
  ["20 combinado", [hallazgo("web", "sin_sitio"), hallazgo("dominio", "dominio_reciente")], 20, "liberar"],
  ["sobre 20", [hallazgo("noticias", "noticias_negativas"), hallazgo("dominio", "dominio_reciente")], 25, "revisar"],
  ["debajo de 60", [hallazgo("sat_69", "listado"), hallazgo("ofac", "coincidencia_parecida")], 55, "revisar"],
  ["60 combinado", [hallazgo("sat_69", "listado"), hallazgo("web", "giro_no_coincide"), hallazgo("dominio", "dominio_reciente")], 60, "revisar"],
  ["sobre 60 sin bloqueo directo", [hallazgo("sat_69", "listado"), hallazgo("ofac", "coincidencia_parecida"), hallazgo("dominio", "dominio_reciente")], 65, "bloquear"],
] as const) {
  test(`umbral: ${nombre}`, () => {
    const r = calcularPuntaje([...entradas]);
    assert.equal(r.puntaje, puntos);
    assert.equal(r.decision, decision);
    assert.equal(r.bloqueo_directo, false);
  });
}

test("tope 100 sin bloqueo directo conserva todos los motivos y sus pesos", () => {
  const r = calcularPuntaje([
    hallazgo("sat_69b", "presunto"), hallazgo("sat_69", "listado"),
    hallazgo("ofac", "coincidencia_parecida"),
  ]);
  assert.equal(r.puntaje, 100);
  assert.equal(r.decision, "bloquear");
  assert.equal(r.bloqueo_directo, false);
  assert.equal(r.motivos.reduce((s, m) => s + m.puntos, 0), 115);
  assert.equal(r.motivos.length, 3);
});

test("bloqueos directos combinados conservan bandera y tope", () => {
  const r = calcularPuntaje([hallazgo("sat_69b", "definitivo"), hallazgo("ofac", "coincidencia_exacta")]);
  assert.equal(r.puntaje, 100);
  assert.equal(r.bloqueo_directo, true);
  assert.equal(r.decision, "bloquear");
  assert.equal(r.motivos.length, 2);
});

test("entradas vacías y errores no activan una política nueva", () => {
  const vacio = { puntaje: 0, decision: "liberar", bloqueo_directo: false, motivos: [] };
  assert.deepEqual(calcularPuntaje([]), vacio);
  for (const fuente of ["sat_69b", "sat_69", "ofac", "web", "noticias", "dominio"] as const) {
    for (const resultado of ["error", "no_consultado", "sin_coincidencia", "desconocido"]) {
      assert.deepEqual(calcularPuntaje([hallazgo(fuente, resultado)]), vacio);
    }
  }
  assert.deepEqual(calcularPuntaje([hallazgo("web", "listado")]), vacio);
});

test("no resuelve silenciosamente estatus contradictorios: conserva ambos motivos", () => {
  const r = calcularPuntaje([hallazgo("sat_69b", "definitivo"), hallazgo("sat_69b", "sentencia_favorable")]);
  assert.equal(r.puntaje, 100);
  assert.equal(r.bloqueo_directo, true);
  assert.deepEqual(r.motivos.map((m) => m.regla), ["69b_definitivo", "69b_sentencia"]);
});

test("no modifica entradas congeladas ni comparte motivos entre llamadas", () => {
  const entradas = [hallazgo("sat_69", "listado"), hallazgo("sat_69", "listado"), hallazgo("web", "sin_sitio")];
  const copia = structuredClone(entradas);
  entradas.forEach(Object.freeze);
  Object.freeze(entradas);
  const r = calcularPuntaje(entradas);
  assert.deepEqual(entradas, copia);
  assert.equal(entradas.length, 3);
  r.motivos[0].puntos = 999;
  assert.equal(calcularPuntaje(entradas).puntaje, 40);
  assert.equal(calcularPuntaje(entradas).motivos[0].puntos, 30);
});

test("resultado completo independiente del orden, incluidos motivos", () => {
  const entradas = casos.map(([fuente, resultado]) => hallazgo(fuente, resultado));
  entradas.push({ ...entradas[0], detalle: "Segunda evidencia" });
  const esperado = calcularPuntaje(entradas);
  assert.deepEqual(calcularPuntaje([...entradas].reverse()), esperado);
  for (let i = 0; i < entradas.length; i++) {
    assert.deepEqual(calcularPuntaje([...entradas.slice(i), ...entradas.slice(0, i)]), esperado);
  }
});
