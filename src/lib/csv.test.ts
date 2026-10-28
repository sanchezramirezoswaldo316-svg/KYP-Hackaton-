import { test } from "node:test";
import assert from "node:assert/strict";
import { filasAAltas, parseCsv, validarFilasCsv } from "./csv.ts";

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

test("validarFilasCsv rechaza RFC, CLABE y campos obligatorios inválidos sin revelar la CLABE", () => {
  const clabe = "123456789012345678";
  const [fila] = validarFilasCsv(`rfc,razon_social,telefono_registrado,clabe\nBAD,Empresa,,${clabe}\n`);
  assert.deepEqual(fila.errores, [
    "RFC inválido.",
    "Falta el teléfono registrado.",
    "CLABE inválida (debe tener 18 dígitos y verificador correcto).",
  ]);
  assert.equal(fila.errores.some((error) => error.includes(clabe)), false);
});

test("validarFilasCsv rechaza celdas que empiezan con fórmulas", () => {
  for (const formula of ["=1+1", "+1+2", "-1+2", "@SUM(A1:A2)"]) {
    const [fila] = validarFilasCsv(`rfc,razon_social,telefono_registrado\nAAA010101AAA,${formula},5512345678\n`);
    assert.ok(fila.errores.some((error) => error.includes("prefijo de fórmula")));
  }
});

test("validarFilasCsv permite teléfonos E.164 que empiezan con +", () => {
  const [fila] = validarFilasCsv("rfc,razon_social,telefono_registrado\nAAA010101AAA,Empresa,+525512345678\n");
  assert.deepEqual(fila.errores, []);
});

test("validarFilasCsv limita la cantidad de filas", () => {
  const texto = `rfc,razon_social\n${Array.from({ length: 5001 }, () => "AAA010101AAA,Empresa").join("\n")}`;
  assert.throws(() => validarFilasCsv(texto), /límite de 5000 filas/);
});
