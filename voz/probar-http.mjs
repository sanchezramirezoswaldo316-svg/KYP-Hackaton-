// Servidor temporal local con credenciales ficticias. No realiza llamadas salientes.
import { spawn } from 'node:child_process';
import { createHmac } from 'node:crypto';
import assert from 'node:assert/strict';
const port = 3197;
const base = `http://127.0.0.1:${port}`;
const env = { ...process.env, APP_PASSWORD:'test-http', WEBHOOK_SECRET:'test-http', ELEVENLABS_WEBHOOK_SECRET:'test-http', ELEVENLABS_AGENT_ID:'agente-test', ELEVENLABS_API_KEY:'',ELEVENLABS_PHONE_NUMBER_ID:'',NEXT_PUBLIC_SUPABASE_URL:'',SUPABASE_SERVICE_ROLE_KEY:'',ANTHROPIC_API_KEY:'',FIRECRAWL_API_KEY:'',NEXT_TELEMETRY_DISABLED:'1' };
const sinPassword = process.argv.includes('--sin-password');
if (sinPassword) { env.APP_PASSWORD=''; env.ELEVENLABS_PHONE_NUMBER_ID='telefono-test'; }
const child = spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)],{env,stdio:'ignore'});
try {
  let listo=false;
  for (let i=0;i<60;i++) {
    try { await fetch(base); listo=true; break; } catch {}
    await new Promise(r=>setTimeout(r,500));
  }
  assert.ok(listo,'Servidor no inició');
  if (sinPassword) {
    assert.equal((await fetch(`${base}/clabe`)).status,503);
    assert.equal((await fetch(`${base}/api/clabe`,{method:'POST',body:'{}'})).status,503);
    console.log('Acceso seguro: páginas y operaciones bloqueadas sin APP_PASSWORD con telefonía configurada.');
  } else {
  const post=async (body, signed=true, endpoint='elevenlabs') => {
    const t=Math.floor(Date.now()/1000);
    const signature=createHmac('sha256','test-http').update(`${t}.${body}`).digest('hex');
    return fetch(`${base}/api/webhooks/${endpoint}`,{method:'POST',headers:signed?{'elevenlabs-signature':`t=${t},v0=${signature}`,'x-kyp-secret':'test-http'}:{},body});
  };
  assert.equal((await post('{}',false)).status,401);
  assert.equal((await post('{')).status,400);
  assert.equal((await post('{}')).status,400);
  assert.equal((await post(JSON.stringify({type:'post_call_transcription',data:{agent_id:'otro',conversation_id:'c'}}))).status,400);
  assert.equal((await post(JSON.stringify({type:'call_initiation_failure',data:{agent_id:'agente-test',conversation_id:'c'}}))).status,503);
  assert.equal((await post('{}',false,'llamada')).status,401);
  assert.equal((await post('{',true,'llamada')).status,400);
  assert.equal((await post(JSON.stringify({solicitud_id:'s',resultado:'inventado',transcripcion:''}),true,'llamada')).status,400);
  assert.equal((await fetch(`${base}/api/voz/llamadas/inexistente/audio`)).status,401);
  assert.equal((await fetch(`${base}/api/voz/llamadas/inexistente/audio`,{headers:{authorization:`Basic ${Buffer.from('test:test-http').toString('base64')}`}})).status,404);
  const basic = {authorization:`Basic ${Buffer.from('test:test-http').toString('base64')}`};
  assert.equal((await fetch(`${base}/clabe`,{headers:{authorization:'Basic !!!'}})).status,401);
  assert.equal((await fetch(`${base}/api/clabe`,{method:'POST',headers:{...basic,'Content-Type':'application/json'},body:'{"proveedor_id":12,"clabe_nueva":12}'})).status,400);
  const missing=await fetch(`${base}/pagina-que-no-existe`,{headers:basic});
  assert.equal(missing.status,404);
  assert.match(await missing.text(),/No encontramos esta página/);
  assert.equal((await fetch(`${base}/api/clabe`,{method:'POST',headers:{...basic,origin:'https://otro.example'},body:'{}'})).status,403);
  console.log('HTTP: 14 comprobaciones correctas (firmas, JSON, agente, correlación, webhook genérico y acceso al audio).');
  }
} finally { child.kill('SIGTERM'); }
