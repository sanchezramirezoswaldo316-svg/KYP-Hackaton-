import { test } from "node:test";
import assert from "node:assert/strict";
import { filasAAltas, parseCsv } from "./csv.ts";

test("parseCsv respeta comillas y comas internas", () => {
  assert.deepEqual(parseCsv('a,b\n"x, y",z\n'), [["a", "b"], ["x, y", "z"]]);
});

test("filasAAltas mapea columnas por nombre", () => {
  const r = filasAAltas("razon_social,rfc,monto_anual\nHarinas SA,AAA010101AAA,1000\n");
  assert.equal(r[0].rfc, "AAA010101AAA");
  assert.equal(r[0].monto_anual, 1000);
  assert.equal(r[0].sitio_web, null);
});

test("filasAAltas exige rfc y razon_social", () => {
  assert.throws(() => filasAAltas("nombre\nX\n"));
});
