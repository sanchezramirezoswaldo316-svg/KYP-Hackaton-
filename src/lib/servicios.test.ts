// Pruebas del flujo de negocio con el almacén en memoria y las listas oficiales reales.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { almacen } from "./almacen/index.ts";
import { altaProveedor, decidirCaso, registrarResultadoLlamada, solicitarCambioClabe, verificar } from "./servicios.ts";

const b69 = JSON.parse(readFileSync("src/data/sat-69b.json", "utf8")).rfc as Record<string, [string, string]>;
const definitivo = Object.entries(b69).find(([r, v]) => v[0] === "definitivo" && r.length === 12)!;

const limpio = {
  rfc: "ZZZ010101AB1", razon_social: "Harinas de Prueba SA de CV", sitio_web: null,
  telefono_registrado: "5512345678", clabe: "002010077777777771", giro_declarado: "Harina", monto_anual: 1_000_000,
  factura_folio: "F-1", factura_monto: 1000,
};

test("proveedor limpio se aprueba solo y no genera caso", async () => {
  const r = await altaProveedor(limpio, "prueba", false);
  assert.equal(r.verificacion.decision, "liberar");
  assert.equal(r.caso, null);
  assert.equal(r.proveedor.estado, "aprobado");
  assert.equal(r.proveedor.telefono_registrado, "+525512345678");
});

test("69-B definitivo genera caso; bloquear exige motivo y aprobarlo exige justificación", async () => {
  const r = await altaProveedor({ ...limpio, rfc: definitivo[0], razon_social: definitivo[1][1] }, "prueba", false);
  assert.equal(r.verificacion.decision, "bloquear");
  assert.ok(r.caso);
  await assert.rejects(decidirCaso(r.caso!.id, "aprobado", "prueba", null), /comentario/);
  await assert.rejects(decidirCaso(r.caso!.id, "bloqueado", "prueba", "  "), /motivo/);
  const c = await decidirCaso(r.caso!.id, "bloqueado", "prueba", "  Riesgo confirmado  ");
  assert.equal(c.estado, "bloqueado");
  assert.equal(c.comentario, "Riesgo confirmado");
  assert.equal((await almacen().proveedores.obtener(r.proveedor.id))!.estado, "bloqueado");
  const evento = (await almacen().bitacora.listar({ entidad_id: c.id })).find((b) => b.accion === "caso_bloqueado");
  assert.equal(evento?.detalle?.comentario, "Riesgo confirmado");
});

test("cambio de CLABE no reconocido pausa el pago y crea caso; confirmado actualiza la cuenta", async () => {
  const p = (await almacen().proveedores.listar({ rfc: limpio.rfc }))[0];
  const { solicitud } = await solicitarCambioClabe(p.id, "012180001234567899", "+525500000000", "prueba");
  assert.equal(solicitud.estado, "pausada");
  await registrarResultadoLlamada({ solicitud_id: solicitud.id, resultado: "no_reconoce", transcripcion: "", simulada: true });
  const casos = await almacen().casos.listar({ proveedor_id: p.id, tipo: "clabe" });
  assert.equal(casos.length, 1);
  assert.equal((await almacen().proveedores.obtener(p.id))!.clabe, limpio.clabe);

  const s2 = (await solicitarCambioClabe(p.id, "012180001234567899", null, "prueba")).solicitud;
  await registrarResultadoLlamada({ solicitud_id: s2.id, resultado: "confirmado", transcripcion: "", simulada: true });
  const final = (await almacen().proveedores.obtener(p.id))!;
  assert.equal(final.clabe, "012180001234567899");
});

test("re-verificar no reactiva el pago si hay un cambio de CLABE pendiente", async () => {
  const p = (await altaProveedor({ ...limpio, rfc: "ZZY010101AB2", razon_social: "Empaques de Prueba SA de CV" }, "prueba", false)).proveedor;
  const { solicitud } = await solicitarCambioClabe(p.id, "012180001234567899", null, "prueba");
  await registrarResultadoLlamada({ solicitud_id: solicitud.id, resultado: "no_reconoce", transcripcion: "", simulada: true });
  const r = await verificar((await almacen().proveedores.obtener(p.id))!, "prueba", false);
  assert.equal(r.verificacion.decision, "liberar");
  assert.equal(r.proveedor.estado, "pausado");
});
