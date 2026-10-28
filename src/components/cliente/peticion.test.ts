import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enviar } from './peticion.ts';
test('peticiones: fallos de red, sesión, HTML y respuesta válida son distinguibles', async t => {
  t.mock.method(globalThis,'fetch',async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(enviar('/api/clabe',{}),/Revisa la conexión/);
  t.mock.method(globalThis,'fetch',async () => new Response('No autorizado',{status:401}));
  await assert.rejects(enviar('/api/clabe',{}),/sesión/);
  t.mock.method(globalThis,'fetch',async () => new Response('<html>error</html>'));
  await assert.rejects(enviar('/api/clabe',{}),/respuesta inesperada/);
  t.mock.method(globalThis,'fetch',async (_url: unknown, init: RequestInit) => { assert.ok(init.signal); return new Response('{"ok":true}'); });
  assert.deepEqual(await enviar('/api/clabe',{},100),{ok:true});
});
