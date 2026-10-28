import { test } from 'node:test';
import assert from 'node:assert/strict';
import { almacen, reiniciarAlmacenMemoria } from '../almacen/index.ts';
import { registrarResultadoLlamada, solicitarCambioClabe } from '../servicios.ts';

// Datos ficticios. fetch siempre interceptado: ninguna llamada real ni consulta SAT.
test('flujo de voz aislado: cuatro resultados, duplicados concurrentes, correlación y fallos', async t => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.ELEVENLABS_API_KEY='test'; process.env.ELEVENLABS_AGENT_ID='agente-test';
  process.env.ELEVENLABS_PHONE_NUMBER_ID='telefono-test'; process.env.ELEVENLABS_WEBHOOK_SECRET='test';
  process.env.VOZ_TELEFONOS_AUTORIZADOS='+525500000001';
  reiniciarAlmacenMemoria();
  const db=almacen();
  for (const resultado of ['confirmado','no_reconoce','datos_no_coinciden','sin_respuesta'] as const) {
    const p=await db.proveedores.crear({rfc:'ZZZ010101AB1',razon_social:'DEMO',sitio_web:null,telefono_registrado:'+525500000001',clabe:'002010077777777771',giro_declarado:null,monto_anual:1000,estado:'aprobado',creado_en:new Date().toISOString()});
    await db.facturas.crear({proveedor_id:p.id,folio:'DEMO-42',monto:1000,fecha:'2026-10-28'});
    const cid='conv-'+p.id;
    t.mock.method(globalThis,'fetch',async (_url: unknown, init: RequestInit) => {
      assert.equal((await db.proveedores.obtener(p.id))?.estado,'pausado');
      const body=JSON.parse(init.body as string);
      assert.equal(body.to_number,p.telefono_registrado);
      assert.equal(body.conversation_initiation_client_data.dynamic_variables.ultimos4_anterior,'7771');
      return new Response(JSON.stringify({success:true,conversation_id:cid}));
    });
    const {solicitud}=await solicitarCambioClabe(p.id,'012180001234567899','+525599999999','test');
    const datos={solicitud_id:solicitud.id,resultado,transcripcion:'Expediente de prueba',resumen:'Resumen de prueba',conversation_id:cid,simulada:false};
    await assert.rejects(registrarResultadoLlamada({...datos,conversation_id:'otra'}),/corresponde/);
    await assert.rejects(registrarResultadoLlamada({...datos,simulada:true}),/simular/);
    const [a,b]=await Promise.all([registrarResultadoLlamada(datos),registrarResultadoLlamada(datos)]);
    assert.equal(a.id,b.id);
    assert.equal((await db.llamadas.listar({solicitud_id:solicitud.id})).length,1);
    assert.equal((await db.casos.listar({solicitud_id:solicitud.id})).length,resultado==='confirmado'?0:1);
    assert.equal((await db.proveedores.obtener(p.id))?.estado,resultado==='confirmado'?'aprobado':'pausado');
    assert.equal((await db.proveedores.obtener(p.id))?.clabe,resultado==='confirmado'?'012180001234567899':p.clabe);
    await assert.rejects(registrarResultadoLlamada({...datos,resultado:resultado==='confirmado'?'no_reconoce':'confirmado'}),/conflicto/);
  }
  const p=(await db.proveedores.listar())[0];
  t.mock.method(globalThis,'fetch',async () => { throw new Error('Fallo de red'); });
  const {solicitud,llamada}=await solicitarCambioClabe(p.id,'012180001234567899',null,'test');
  assert.equal(llamada.iniciada,false);
  assert.equal((await db.proveedores.obtener(p.id))?.estado,'pausado');
  assert.equal((await db.casos.listar({solicitud_id:solicitud.id})).length,1);
});
