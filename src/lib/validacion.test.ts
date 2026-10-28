import { test } from "node:test";
import assert from "node:assert/strict";
import { clabeValida, rfcValido, normalizarTelefono } from "./validacion.ts";

test("CLABE con dígito verificador correcto", () => {
  assert.equal(clabeValida("002010077777777771"), true);
});

test("CLABE con dígito verificador incorrecto", () => {
  assert.equal(clabeValida("002010077777777772"), false);
  assert.equal(clabeValida("12345"), false);
});

test("RFC persona moral y física", () => {
  assert.equal(rfcValido("AAA080808HL8"), true);
  assert.equal(rfcValido("GODE561231GR8"), true);
  assert.equal(rfcValido("XYZ"), false);
});

test("teléfono de 10 dígitos se normaliza a +52", () => {
  assert.equal(normalizarTelefono("55 1234 5678"), "+525512345678");
});
