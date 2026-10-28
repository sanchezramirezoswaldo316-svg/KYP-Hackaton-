import assert from "node:assert/strict";
import { test } from "node:test";
import type { EventoBitacora, Llamada, SolicitudClabe } from "../tipos.ts";
import { leerTranscripcion, marcadoresLlamada, vistaLlamada } from "./monitor.ts";

const solicitud = (estado: SolicitudClabe["estado"]): SolicitudClabe => ({
  id: "s1", proveedor_id: "p1", clabe_nueva: "002010077777777771", telefono_en_solicitud: "+52 55 9999 0000", estado, creado_en: "2026-10-28T14:02:10.000Z",
});
const llamada = (resultado: Llamada["resultado"], transcripcion = "Agente: Hola\nProveedor: Sí, soy yo.\nAgente: ¿Pidió el cambio?\nProveedor: No."): Llamada => ({
  id: "l1", solicitud_id: "s1", conversation_id: null, resultado, transcripcion, resumen: null, simulada: true, creado_en: "2026-10-28T14:03:31.000Z",
});
const evento = (accion: string, detalle: Record<string, unknown> | null = null): EventoBitacora => ({
  id: accion, actor: "x", accion, entidad: "solicitud_clabe", entidad_id: "s1", detalle, creado_en: "2026-10-28T14:03:00.000Z",
});

test("mientras se llama, el guion espera en '¿contestó?' y el pago sigue congelado", () => {
  const v = vistaLlamada(solicitud("en_llamada"), undefined, [evento("llamada_iniciada")]);
  assert.equal(v.fase, "llamando");
  assert.equal(v.ruta.marcar, "hecho");
  assert.equal(v.ruta.contesto, "actual");
  assert.equal(v.dinero.estado, "congelado");
  assert.equal(v.criterios[0].valor, "EVALUANDO");
});

test("si el proveedor no reconoce el cambio, la ruta termina en fraude y el dinero queda protegido", () => {
  const v = vistaLlamada(solicitud("pausada"), llamada("no_reconoce"), [evento("llamada_no_reconoce", { simulada: true })]);
  assert.equal(v.fase, "terminada");
  assert.equal(v.ruta.fraude, "peligro");
  assert.equal(v.ruta.confirmado, "apagado");
  assert.equal(v.dinero.estado, "protegido");
  assert.deepEqual(v.criterios.map((c) => c.valor), ["SÍ", "NO", "NO APLICA"]);
  assert.equal(v.eventos.at(-1)?.fuente, "Simulación (demo)");
});

test("sin respuesta: no se evalúa si reconoce ni los datos", () => {
  const v = vistaLlamada(solicitud("pausada"), llamada("sin_respuesta", ""), []);
  assert.equal(v.ruta.sin_respuesta, "alerta");
  assert.deepEqual(v.criterios.map((c) => c.valor), ["NO", "NO APLICA", "NO APLICA"]);
  assert.equal(v.dinero.estado, "en_revision");
});

test("una llamada fallida se muestra como tal aunque no haya resultado", () => {
  const v = vistaLlamada(solicitud("pausada"), undefined, [evento("llamada_fallida")]);
  assert.equal(v.fase, "fallida");
  assert.equal(v.ruta.marcar, "alerta");
});

test("la transcripción se separa por quien habla y las posiciones suman 1", () => {
  const m = leerTranscripcion("Agente: Hola\nProveedor: Sí\n\ntexto suelto");
  assert.deepEqual(m.map((x) => x.quien), ["agente", "proveedor", "agente"]);
  assert.ok(Math.abs(m.reduce((s, x) => s + x.largo, 0) - 1) < 1e-9);
  assert.equal(m[0].inicio, 0);
});

test("los marcadores señalan cuándo contestó y la frase decisiva", () => {
  const ms = marcadoresLlamada(leerTranscripcion(llamada("no_reconoce").transcripcion), "no_reconoce");
  assert.deepEqual(ms.map((m) => m.titulo), ["CONTESTÓ", "NO RECONOCE EL CAMBIO"]);
  assert.ok(ms[0].pos < ms[1].pos);
});
