// Pruebas de políticas, documentos del proveedor, recordatorios, monitoreo y resumen (almacén en memoria, listas reales).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { almacen } from "./almacen/index.ts";
import { procesarRecordatorios, recibirDocumento, DIAS_ENTRE_RECORDATORIOS } from "./documentos.ts";
import { ejecutarMonitoreo, generarResumen, simularPublicacion, tareaDiaria } from "./monitoreo.ts";
import { altaProveedor, aplicarPoliticasAPendientes, cambiarPolitica, proximosPagos, venceSimulado } from "./servicios.ts";

const b69 = JSON.parse(readFileSync("src/data/sat-69b.json", "utf8")).rfc as Record<string, [string, string]>;
const buscar = (estatus: string, n = 0) => Object.entries(b69).filter(([r, v]) => v[0] === estatus && r.length === 12)[n];
const base = { sitio_web: null, telefono_registrado: "5512345678", clabe: null, giro_declarado: "Servicios", monto_anual: 1_000_000, factura_folio: "F-77", factura_monto: 50_000 };
const DIA = 86_400_000;

test("la fecha de pago simulada es estable y cae entre 1 y 30 días", () => {
  const hoy = new Date("2026-10-28T12:00:00Z");
  const v = venceSimulado("F-77", hoy);
  assert.equal(v, venceSimulado("F-77", hoy));
  const dias = (Date.parse(v) - Date.parse("2026-10-28")) / DIA;
  assert.ok(dias >= 1 && dias <= 30);
});

test("política activa bloquea sola a una empresa fantasma confirmada", async () => {
  await cambiarPolitica("bloquear_efos", true, "Ana");
  const [rfc, [, nombre]] = buscar("definitivo");
  const r = await altaProveedor({ ...base, rfc, razon_social: nombre }, "prueba", false);
  assert.equal(r.caso?.estado, "bloqueado");
  assert.match(r.caso?.decidido_por ?? "", /^Política:/);
  assert.equal((await almacen().proveedores.obtener(r.proveedor.id))!.estado, "bloqueado");
  assert.ok((await almacen().alertas.listar({ tipo: "politica_aplicada" })).length >= 1);
});

test("política de documentos pide la 32-D y deja el caso en la bandeja", async () => {
  await cambiarPolitica("documentos_presunto", true, "Ana");
  const [rfc, [, nombre]] = buscar("presunto");
  const r = await altaProveedor({ ...base, rfc, razon_social: nombre }, "prueba", false);
  assert.equal(r.caso?.estado, "pendiente");
  const docs = await almacen().documentos.listar({ proveedor_id: r.proveedor.id });
  assert.equal(docs.length, 1);
  assert.equal(docs[0].estado, "enviada");
  assert.equal(docs[0].notificada, false); // sin n8n configurado no se envía, y se dice
});

test("el portal solo acepta PDF, una vez, y deja alerta para la gestora", async () => {
  const [rfc] = buscar("presunto");
  const p = (await almacen().proveedores.listar({ rfc }))[0];
  const d = (await almacen().documentos.listar({ proveedor_id: p.id }))[0];
  await assert.rejects(recibirDocumento(d.token, "foto.png", new Uint8Array([0x89, 0x50, 0x4e, 0x47])), /PDF/);
  await assert.rejects(recibirDocumento("token-falso", "a.pdf", Buffer.from("%PDF-1.4")), /no es válido/);
  const r = await recibirDocumento(d.token, "opinion.pdf", Buffer.from("%PDF-1.4\n%prueba\n"));
  assert.equal(r.estado, "recibida");
  assert.equal(r.archivo_sha256?.length, 64);
  await assert.rejects(recibirDocumento(d.token, "otra.pdf", Buffer.from("%PDF-1.4")), /Ya recibimos/);
  assert.ok((await almacen().alertas.listar({ tipo: "documento_recibido" })).some((a) => a.proveedor_id === p.id));
});

test("recordatorios cada 3 días y la solicitud vence tras el último", async () => {
  const [rfc, [, nombre]] = buscar("presunto", 1);
  const r = await altaProveedor({ ...base, rfc, razon_social: nombre }, "prueba", false);
  const d = (await almacen().documentos.listar({ proveedor_id: r.proveedor.id }))[0];
  const t0 = Date.parse(d.enviada_en);
  assert.equal((await procesarRecordatorios(new Date(t0 + DIA))).enviados, 0);
  assert.equal((await procesarRecordatorios(new Date(t0 + DIAS_ENTRE_RECORDATORIOS * DIA + 1000))).enviados, 1);
  assert.equal((await procesarRecordatorios(new Date(t0 + 2 * DIAS_ENTRE_RECORDATORIOS * DIA + 2000))).enviados, 1);
  const fin = await procesarRecordatorios(new Date(t0 + 3 * DIAS_ENTRE_RECORDATORIOS * DIA + 3000));
  assert.equal(fin.vencidas, 1);
  assert.equal((await almacen().documentos.obtener(d.id))!.estado, "vencida");
});

test("aplicar políticas a casos que ya estaban en la bandeja", async () => {
  await cambiarPolitica("documentos_art69", false, "Ana");
  const a69 = JSON.parse(readFileSync("src/data/sat-69.json", "utf8")).rfc as Record<string, unknown>;
  const rfc = Object.keys(a69).find((r) => r.length === 12 && !b69[r])!;
  const r = await altaProveedor({ ...base, rfc, razon_social: "Contribuyente de prueba Art 69" }, "prueba", false);
  assert.equal((await almacen().documentos.listar({ proveedor_id: r.proveedor.id })).length, 0);
  await cambiarPolitica("documentos_art69", true, "Ana");
  const res = await aplicarPoliticasAPendientes("Ana");
  assert.ok(res.documentos >= 1);
  assert.equal((await almacen().documentos.listar({ proveedor_id: r.proveedor.id })).length, 1);
});

test("monitoreo detecta un cambio en las listas una sola vez y retiene el pago", async () => {
  const limpio = await altaProveedor({ ...base, rfc: "ZZZ010101AB1", razon_social: "Harinas de Monitoreo SA de CV", factura_folio: "F-1", factura_vence: new Date(Date.now() + 2 * DIA).toISOString().slice(0, 10) }, "prueba", false);
  assert.equal(limpio.proveedor.estado, "aprobado");
  assert.ok((await proximosPagos()).get(limpio.proveedor.id));
  const simulado = await simularPublicacion();
  assert.equal(simulado?.id, limpio.proveedor.id); // el aprobado con el pago más próximo
  const m1 = await ejecutarMonitoreo("Monitoreo");
  assert.equal(m1.cambios.length, 1);
  assert.equal((await almacen().proveedores.obtener(limpio.proveedor.id))!.estado, "en_revision");
  const alerta = (await almacen().alertas.listar({ tipo: "cambio_lista" })).find((a) => a.proveedor_id === limpio.proveedor.id);
  assert.match(alerta!.mensaje, /retenido/);
  assert.equal((await ejecutarMonitoreo("Monitoreo")).cambios.length, 0);
});

test("resumen diario y tarea diaria", async () => {
  const r = await generarResumen();
  assert.ok(r.datos.casos_abiertos >= 1);
  assert.ok(r.datos.pagos_retenidos_7_dias >= 1);
  assert.match(r.texto, /Resumen KYP/);
  const t = await tareaDiaria("Tarea diaria");
  assert.equal(t.resumen_enviado, false); // sin n8n: no se envía y se informa el motivo
  assert.match(t.motivo_resumen ?? "", /no configurado/);
  assert.ok((await almacen().bitacora.listar({ accion: "tarea_diaria" })).length === 1);
});
