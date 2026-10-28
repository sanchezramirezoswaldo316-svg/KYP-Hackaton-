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
