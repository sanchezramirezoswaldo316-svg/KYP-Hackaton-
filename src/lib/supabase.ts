import { createClient } from "@supabase/supabase-js";

// Solo para código de servidor (rutas /api). Devuelve null si aún no hay credenciales,
// para que la app funcione con datos de prueba mientras se configura Supabase.
export function supabaseServidor() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
