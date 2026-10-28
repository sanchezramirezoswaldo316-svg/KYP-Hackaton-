import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('PostgreSQL: cuatro resultados atómicos, duplicados, conflictos y rollback', async () => {
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role;');
    await db.exec(readFileSync('supabase/migrations/0001_inicial.sql','utf8').replace('create extension if not exists pgcrypto;',''));
    await db.exec(readFileSync('supabase/migrations/0002_resultado_voz.sql','utf8'));
    await db.exec(readFileSync('supabase/migrations/0003_solicitud_voz_atomica.sql','utf8'));
    const p = (await db.query<{id:string}>("insert into proveedores(rfc,razon_social,telefono_registrado,clabe,estado) values('ZZZ010101AB1','DEMO','+525500000001','anterior','pausado') returning id")).rows[0];
    await db.exec("alter table bitacora add constraint fallo_inicio check (accion <> 'solicitud_clabe') not valid;");
    await assert.rejects(db.query("select crear_solicitud_voz($1,'nueva',null,'test')",[p.id]));
    assert.equal((await db.query('select * from solicitudes_clabe')).rows.length,0);
    await db.exec('alter table bitacora drop constraint fallo_inicio;');
    const inicio = await db.query<{s:{id:string}}>("select crear_solicitud_voz($1,'nueva',null,'test') as s",[p.id]);
    assert.ok(inicio.rows[0].s.id);
    await db.query("update solicitudes_clabe set estado='rechazada' where id=$1",[inicio.rows[0].s.id]);
    for (const resultado of ['confirmado','no_reconoce','datos_no_coinciden','sin_respuesta']) {
      const s = (await db.query<{id:string}>("insert into solicitudes_clabe(proveedor_id,clabe_nueva) values($1,'nueva') returning id",[p.id])).rows[0];
      const cid='conv-'+s.id;
      await db.query("insert into bitacora(actor,accion,entidad,entidad_id,detalle) values('test','llamada_iniciada','solicitud_clabe',$1,$2)",[s.id,JSON.stringify({conversation_id:cid})]);
      const payload={solicitud_id:s.id,resultado,conversation_id:cid,simulada:false,transcripcion:'Prueba',resumen:'Resumen'};
      const aplicar=(datos: object)=>db.query<{r:{id:string}}>('select registrar_resultado_voz($1::jsonb) as r',[JSON.stringify(datos)]);
      await assert.rejects(aplicar({...payload,conversation_id:'otra'}));
      assert.equal((await db.query('select * from llamadas where solicitud_id=$1',[s.id])).rows.length,0);
      const [a,b]=await Promise.all([aplicar(payload),aplicar(payload)]);
      assert.equal(a.rows[0].r.id,b.rows[0].r.id);
      await assert.rejects(aplicar({...payload,resultado:resultado==='confirmado'?'no_reconoce':'confirmado'}));
      assert.equal((await db.query('select * from llamadas where solicitud_id=$1',[s.id])).rows.length,1);
      assert.equal((await db.query('select * from casos where solicitud_id=$1',[s.id])).rows.length,resultado==='confirmado'?0:1);
      assert.equal((await db.query<{estado:string}>('select estado from proveedores where id=$1',[p.id])).rows[0].estado,resultado==='confirmado'?'aprobado':'pausado');
    }
    // Fallo al insertar bitácora: revierte también evidencia, caso y actualización de solicitud.
    const s=(await db.query<{id:string}>("insert into solicitudes_clabe(proveedor_id,clabe_nueva) values($1,'rollback') returning id",[p.id])).rows[0];
    await db.exec("alter table bitacora add constraint fallo_prueba check (accion <> 'llamada_confirmado') not valid;");
    await assert.rejects(db.query('select registrar_resultado_voz($1::jsonb)',[JSON.stringify({solicitud_id:s.id,resultado:'confirmado',simulada:true})]));
    assert.equal((await db.query('select * from llamadas where solicitud_id=$1',[s.id])).rows.length,0);
    assert.equal((await db.query<{estado:string}>('select estado from solicitudes_clabe where id=$1',[s.id])).rows[0].estado,'pausada');
  } finally { await db.close(); }
});
