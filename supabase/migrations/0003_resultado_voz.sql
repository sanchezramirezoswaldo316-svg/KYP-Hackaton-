-- No altera los contratos compartidos. Ejecutar después de 0001.
-- La transacción incluye evidencia, solicitud, proveedor, caso y bitácora.
create or replace function registrar_resultado_voz(entrada jsonb) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  s solicitudes_clabe%rowtype;
  p proveedores%rowtype;
  l llamadas%rowtype;
  r text := entrada->>'resultado';
  cid text := entrada->>'conversation_id';
  sim boolean := coalesce((entrada->>'simulada')::boolean, false);
  base text;
  motivo text;
begin
  if r not in ('confirmado','no_reconoce','datos_no_coinciden','sin_respuesta') or r is null then
    raise exception 'Resultado inválido' using errcode = '22023';
  end if;
  select * into s from solicitudes_clabe where id = (entrada->>'solicitud_id')::uuid;
  if not found then raise exception 'Solicitud inexistente' using errcode = '22023'; end if;
  -- Mismo orden de bloqueo para todas las solicitudes de un proveedor.
  select * into p from proveedores where id = s.proveedor_id for update;
  select * into s from solicitudes_clabe where id = s.id for update;
  select * into l from llamadas where solicitud_id = s.id order by creado_en limit 1;
  if found then
    if l.resultado <> r or l.conversation_id is distinct from cid or l.simulada <> sim then
      raise exception 'Resultado en conflicto' using errcode = '22023';
    end if;
    return to_jsonb(l);
  end if;
  if s.estado in ('verificada','rechazada') then raise exception 'Solicitud resuelta' using errcode = '22023'; end if;
  if not sim and (cid is null or not exists (
    select 1 from bitacora where entidad_id = s.id::text and accion = 'llamada_iniciada' and detalle->>'conversation_id' = cid
  )) then raise exception 'Conversación no correlacionada' using errcode = '22023'; end if;
  insert into llamadas(solicitud_id, conversation_id, resultado, transcripcion, resumen, simulada)
  values(s.id, cid, r, coalesce(entrada->>'transcripcion',''), entrada->>'resumen', sim) returning * into l;
  if r = 'confirmado' then
    update solicitudes_clabe set estado = 'verificada' where id = s.id;
    select case estado when 'pendiente' then 'en_revision' when 'aprobado' then 'aprobado' when 'pausado' then 'pausado' else 'bloqueado' end
      into base from casos where proveedor_id = p.id and tipo = 'alta' order by creado_en desc limit 1;
    if exists(select 1 from solicitudes_clabe where proveedor_id = p.id and id <> s.id and estado in ('pausada','en_llamada')) then base := 'pausado'; end if;
    update proveedores set clabe = s.clabe_nueva, estado = coalesce(base,'aprobado') where id = p.id;
  else
    update solicitudes_clabe set estado = 'pausada' where id = s.id;
    update proveedores set estado = 'pausado' where id = p.id;
    motivo := case r when 'no_reconoce' then 'El proveedor NO reconoce la solicitud de cambio de CLABE' when 'datos_no_coinciden' then 'Los datos confirmados en la llamada no coinciden' else 'No se pudo contactar al teléfono registrado' end;
    insert into casos(proveedor_id,tipo,prioridad,estado,decision_sugerida,motivo,solicitud_id)
      values(p.id,'clabe',100 * greatest(p.monto_anual,1),'pendiente','bloquear',motivo,s.id);
  end if;
  insert into bitacora(actor,accion,entidad,entidad_id,detalle)
    values(case when sim then 'Simulación (demo)' else 'Agente de voz' end,'llamada_' || r,'solicitud_clabe',s.id::text,jsonb_build_object('simulada',sim));
  return to_jsonb(l);
end $$;
revoke all on function registrar_resultado_voz(jsonb) from public, anon, authenticated;
grant execute on function registrar_resultado_voz(jsonb) to service_role;
