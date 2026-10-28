import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { firmaValida, interpretarEvento, eventoSchema, iniciarLlamada } from './elevenlabs.ts';
import { obtenerAudio } from './audio.ts';

test('firma: cuerpo original, caducidad, futuro, hex truncado y rotación', () => {
  process.env.ELEVENLABS_WEBHOOK_SECRET = 'secreto-solo-pruebas';
  const cuerpo = '{"data":{}}';
  const t = Math.floor(Date.now()/1000);
  const firma = (ts: number) => createHmac('sha256', 'secreto-solo-pruebas').update(`${ts}.${cuerpo}`).digest('hex');
  assert.ok(firmaValida(cuerpo, `t=${t}, v0=${firma(t)}`));
  assert.ok(firmaValida(cuerpo, `t=${t},v0=${'0'.repeat(64)},v0=${firma(t)}`));
  for (const header of [null, `t=${t-301},v0=${firma(t-301)}`, `t=${t+301},v0=${firma(t+301)}`, `t=${t},v0=${firma(t)}zz`, `t=${t},t=${t},v0=${firma(t)}`]) assert.equal(firmaValida(cuerpo, header), false);
  assert.equal(firmaValida(cuerpo+' ', `t=${t},v0=${firma(t)}`), false);
});

test('cuatro resultados, resumen y transcripción; eventos incompletos no confirman', () => {
  for (const resultado of ['confirmado','no_reconoce','datos_no_coinciden','sin_respuesta']) {
    const evento = eventoSchema.parse({ type:'post_call_transcription', data:{ agent_id:'agente-test',conversation_id:'conv-test',status:'done', transcript:[{role:'agent',message:'Pregunta'},{role:'user',message:'Respuesta'}], analysis:{transcript_summary:'Resumen', data_collection_results:{resultado:{value:resultado}}},conversation_initiation_client_data:{dynamic_variables:{solicitud_id:'s-test'}} } });
    const r = interpretarEvento(evento);
    assert.equal(r.resultado, resultado);
    assert.equal(r.resumen, 'Resumen');
    assert.equal(r.transcripcion, 'Agente: Pregunta\nProveedor: Respuesta');
    assert.equal(r.solicitud_id, 's-test');
    assert.equal(interpretarEvento({...evento,data:{...evento.data,status:'failed'}}).resultado,'sin_respuesta');
  }
  assert.equal(eventoSchema.safeParse({type:'post_call_transcription',data:{}}).success,false);
  const fallo = interpretarEvento(eventoSchema.parse({type:'call_initiation_failure',data:{agent_id:'a',conversation_id:'c',failure_reason:'busy'}}));
  assert.equal(fallo.resultado,'sin_respuesta');
  assert.equal(fallo.solicitud_id,null);
});

test('telefonía: lista autorizada, errores sanitizados, timeout configurado y correlación requerida', async (t) => {
  process.env.VOZ_TELEFONOS_AUTORIZADOS = '+525500000001';
  let calls = 0;
  t.mock.method(globalThis,'fetch',async (_url: unknown, init: RequestInit) => {
    calls++; assert.ok(init.signal);
    assert.equal(JSON.parse(init.body as string).to_number,'+525500000001');
    return new Response(JSON.stringify({success:true,conversation_id:'c-test'}));
  });
  await assert.rejects(iniciarLlamada('+525500000002',{}), /autorizado/);
  assert.equal(calls,0);
  assert.equal(await iniciarLlamada('+525500000001',{}),'c-test');
  t.mock.method(globalThis,'fetch',async () => new Response('contenido sensible',{status:500}));
  await assert.rejects(iniciarLlamada('+525500000001',{}), /^Error: ElevenLabs respondió 500$/);
  t.mock.method(globalThis,'fetch',async () => new Response('{}'));
  await assert.rejects(iniciarLlamada('+525500000001',{}), /conversation_id/);
});

test('audio: proxy privado, escape del ID y audio no disponible', async (t) => {
  process.env.ELEVENLABS_API_KEY = 'solo-test';
  t.mock.method(globalThis,'fetch',async (url: string) => {
    assert.ok(url.includes('conv%2Ftest'));
    return new Response(new Uint8Array([1,2,3]));
  });
  const audio = await obtenerAudio('conv/test');
  assert.equal(audio.headers.get('cache-control'),'private, no-store');
  assert.deepEqual([...new Uint8Array(await audio.arrayBuffer())],[1,2,3]);
  t.mock.method(globalThis,'fetch',async () => new Response('',{status:404}));
  assert.equal((await obtenerAudio('c')).status,404);
});
