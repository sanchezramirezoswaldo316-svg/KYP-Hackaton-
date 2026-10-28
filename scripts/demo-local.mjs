// Inicia la app en esta máquina. Conserva APIs externas; no marca ni escribe en Supabase.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(root, true);
const portArg = process.argv.find(a => a.startsWith('--port='));
const port = Number(portArg?.split('=')[1] ?? 3000);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Puerto inválido (1024–65535)');
const env = {
  ...process.env,
  KYP_DEMO_LOCAL: '1',
  NEXT_PUBLIC_SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '',
  ELEVENLABS_PHONE_NUMBER_ID: '',
  APP_URL: `http://localhost:${port}`,
  NEXT_TELEMETRY_DISABLED: '1',
};
console.log(`Demo local: http://localhost:${port}/clabe`);
console.log('Datos en memoria; se pierden al reiniciar. Telefonía simulada: no se llama a Twilio.');
console.log('Firecrawl, IA y avisos n8n conservan su configuración; si están habilitados pueden consumir sus servicios.');
console.log('Los enlaces localhost del portal solo abren desde esta máquina.');
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: root, env, stdio: 'inherit' });
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', () => { console.error('No se pudo iniciar Next. Ejecuta npm ci e inténtalo de nuevo.'); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 0; });
