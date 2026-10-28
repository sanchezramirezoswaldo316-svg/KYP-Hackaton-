import { test } from "node:test";
import assert from "node:assert/strict";
import { consultar69, consultar69B, consultarOfac, indexarOfac, type DatosOfac } from "./listas-core.ts";
import { normalizarNombre, similitud } from "./nombres.ts";

const d69b = {
  actualizacion: "2025-12-31", sha256: "x", registros: 2,
  rfc: {
    AAA010101AAA: ["presunto", "EMPRESA FANTASMA SA DE CV", "2025-05-12"],
    BBB010101BBB: ["desvirtuado", "OTRA SA DE CV", "2024-01-01"],
  },
} as const;

test("69-B encuentra presunto con fecha", () => {
  const h = consultar69B(d69b as never, "AAA010101AAA");
  assert.equal(h.resultado, "presunto");
  assert.equal(h.fecha_fuente, "2025-05-12");
});

test("69-B sin coincidencia", () => {
  assert.equal(consultar69B(d69b as never, "ZZZ010101ZZZ").resultado, "sin_coincidencia");
});

test("Art. 69 agrupa supuestos", () => {
  const h = consultar69({ listas: [], registros: 1, rfc: { AAA010101AAA: [["no_localizado", "2014-01-01"]] } }, "AAA010101AAA");
  assert.equal(h.resultado, "listado");
  assert.match(h.detalle, /no localizado/);
});

test("normalización quita sufijos societarios y acentos", () => {
  assert.equal(normalizarNombre("Transportes Águila, S.A. de C.V."), "TRANSPORTES AGUILA");
  assert.equal(similitud("ABC", "ABC"), 1);
});

const ofac: DatosOfac = {
  sha256: "x", registros: 2, descargado_en: "2026-10-28T00:00:00Z",
  entidades: [
    [1, "LOS CUINIS S.A. DE C.V.", "entidad", "SDNTK"],
    [2, "BANCO NACIONAL DE CUBA", "entidad", "CUBA"],
  ],
};

test("OFAC coincidencia exacta ignorando sufijos", () => {
  assert.equal(consultarOfac(indexarOfac(ofac), "Los Cuinis, S.A. de C.V.").resultado, "coincidencia_exacta");
});

test("OFAC nombre parecido es homónimo, no bloqueo", () => {
  assert.equal(consultarOfac(indexarOfac(ofac), "Banco Nacional de Cubas SA").resultado, "coincidencia_parecida");
});

test("OFAC sin coincidencia", () => {
  assert.equal(consultarOfac(indexarOfac(ofac), "Harinas del Bajío SA de CV").resultado, "sin_coincidencia");
});
