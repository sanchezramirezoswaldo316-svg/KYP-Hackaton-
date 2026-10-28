// Ejecutar: node --env-file=.env voz/configurar-agente.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const guion = readFileSync(new URL('./guion-agente.md', import.meta.url), 'utf8');
const body = {
  name: 'KYP Axel — verificación CLABE (pruebas)',
  conversation_config: {
    agent: {
      language: 'es',
      first_message: guion.split('**Primer mensaje:**')[1].split('**Prompt del sistema:**')[0].trim().replace(/^"|"$/g, ''),
      prompt: { prompt: guion.split('**Prompt del sistema:**')[1].trim(), temperature: 0.1 },
      dynamic_variables: { dynamic_variable_placeholders: {
        empresa: 'Empresa DEMO', proveedor: 'Proveedor DEMO', folio_factura: 'DEMO-42',
        monto_factura: '1000', ultimos4_anterior: '7771', solicitud_id: 'solo-prueba',
      } },
    },
    tts: { voice_id: 'EXAVITQu4vr4xnSDxMaL', model_id: 'eleven_flash_v2_5' },
    turn: { turn_timeout: 10 },
    conversation: { max_duration_seconds: 240 },
  },
  platform_settings: {
    privacy: { record_voice: true, retention_days: 30 },
    data_collection: { resultado: {
      type: 'string', description: 'Clasifica la conversación completa. confirmado SOLO si el representante reconoce el cambio y proporciona sin pistas folio correcto, monto con diferencia menor al 5% y últimos cuatro dígitos exactos de la cuenta anterior. no_reconoce si niega el cambio. datos_no_coinciden si algún dato es incorrecto o falta tras intentar verificar. sin_respuesta si silencio, buzón, tercero, rechazo de grabación o solicitud de atención humana. Nunca deduzcas aprobación del cierre del agente.',
      enum: ['confirmado', 'no_reconoce', 'datos_no_coinciden', 'sin_respuesta'],
    } },
  },
};
writeFileSync(new URL('./agente-config.json', import.meta.url), JSON.stringify(body, null, 2) + '\n');
if (process.argv.includes('--solo-archivo')) process.exit(0);
if (!process.env.ELEVENLABS_API_KEY) throw new Error('Falta ELEVENLABS_API_KEY');
const headers = { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' };
const base = 'https://api.elevenlabs.io/v1/convai/agents';
let id = process.env.ELEVENLABS_AGENT_ID;
const local = new URL('./agente-remoto.json', import.meta.url);
if (!id) { try { id = JSON.parse(readFileSync(local, 'utf8')).agent_id; } catch {} }
if (id) {
  const previo = await fetch(`${base}/${encodeURIComponent(id)}`, { headers });
  if (!previo.ok) throw new Error(`No se pudo inspeccionar agente: HTTP ${previo.status}`);
  const actual = await previo.json();
  if (!actual.name?.startsWith('KYP Axel')) throw new Error('El agente existente no corresponde a Axel');
}
const res = await fetch(id ? `${base}/${encodeURIComponent(id)}` : `${base}/create`, { method: id ? 'PATCH' : 'POST', headers, body: JSON.stringify(body) });
if (!res.ok) {
  // Solo campos de validación; nunca cuerpo completo ni cabeceras.
  const error = await res.json().catch(() => ({}));
  console.error('HTTP', res.status, Array.isArray(error.detail) ? error.detail.map(d => ({ loc: d.loc, type: d.type })) : 'Configuración rechazada');
  process.exit(1);
}
id = (await res.json()).agent_id ?? id;
writeFileSync(local, JSON.stringify({ agent_id: id, telefonia_validada: false }, null, 2) + '\n');
const check = await fetch(`${base}/${encodeURIComponent(id)}`, { headers });
if (!check.ok) throw new Error(`Lectura posterior: HTTP ${check.status}`);
const saved = await check.json();
console.log(JSON.stringify({ agent_id: id, language: saved.conversation_config?.agent?.language, record_voice: saved.platform_settings?.privacy?.record_voice, resultado: !!saved.platform_settings?.data_collection?.resultado }));
