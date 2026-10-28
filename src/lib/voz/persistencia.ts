import { createClient } from "@supabase/supabase-js";
import type { Llamada } from "../tipos.ts";
import { ErrorValidacion } from "../servicios.ts";

export async function registrarResultadoPersistente(datos: {
  solicitud_id: string; resultado: string; transcripcion: string;
  conversation_id?: string | null; resumen?: string | null; simulada: boolean;
}): Promise<Llamada> {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data, error } = await db.rpc("registrar_resultado_voz", { entrada: datos });
  if (error) {
    if (error.code === "22023") throw new ErrorValidacion("Resultado incompatible o conversación no correlacionada");
    throw new Error("No se pudo persistir la evidencia de voz; verificar migración 0003");
  }
  return data as Llamada;
}

export async function crearSolicitudPersistente(proveedorId: string, clabeNueva: string, telefono: string | null, actor: string) {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data, error } = await db.rpc('crear_solicitud_voz', { proveedor: proveedorId, nueva: clabeNueva, telefono, actor });
  if (error) {
    if (error.code === '22023') throw new ErrorValidacion('El proveedor no existe o está bloqueado');
    throw new Error('No se pudo registrar la solicitud de voz de forma segura');
  }
  return data as import('../tipos.ts').SolicitudClabe;
}
