import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avisoVoz } from './estado.ts';
import type { SolicitudClabe } from '../tipos.ts';
const solicitud: SolicitudClabe = { id:'s',proveedor_id:'p',clabe_nueva:'prueba',telefono_en_solicitud:null,estado:'en_llamada',creado_en:'2026-10-28T00:00:00Z' };
test('muestra fallo persistido y webhook atrasado sin afirmar liberación ni reintentar', () => {
  assert.match(avisoVoz(solicitud,undefined,true)!,/sigue pausado/);
  assert.match(avisoVoz(solicitud,undefined,false,Date.parse('2026-10-28T00:11:00Z'))!,/no recibimos/);
  assert.equal(avisoVoz(solicitud,undefined,false,Date.parse('2026-10-28T00:01:00Z')),null);
  assert.equal(avisoVoz({...solicitud,estado:'verificada'},undefined,true),null);
});
