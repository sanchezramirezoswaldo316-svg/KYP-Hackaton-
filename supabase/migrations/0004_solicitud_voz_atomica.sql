-- Registrar solicitud, pausar pago y guardar bitácora es una sola operación.
create or replace function crear_solicitud_voz(proveedor uuid, nueva text, telefono text, actor text)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  p proveedores%rowtype;
  s solicitudes_clabe%rowtype;
begin
  select * into p from proveedores where id = proveedor for update;
  if not found or p.estado = 'bloqueado' then
    raise exception 'Proveedor inexistente o bloqueado' using errcode = '22023';
  end if;
  insert into solicitudes_clabe(proveedor_id, clabe_nueva, telefono_en_solicitud, estado)
    values(p.id, nueva, telefono, 'pausada') returning * into s;
  update proveedores set estado = 'pausado' where id = p.id;
  insert into bitacora(actor, accion, entidad, entidad_id, detalle)
    values(actor, 'solicitud_clabe', 'solicitud_clabe', s.id::text, jsonb_build_object('proveedor_id',p.id,'pago','pausado'));
  return to_jsonb(s);
end $$;
revoke all on function crear_solicitud_voz(uuid,text,text,text) from public, anon, authenticated;
grant execute on function crear_solicitud_voz(uuid,text,text,text) to service_role;
