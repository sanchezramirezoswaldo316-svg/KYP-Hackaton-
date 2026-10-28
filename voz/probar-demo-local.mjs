// Prueba el flujo HTTP completo con el lanzador real y datos ficticios. Sin llamadas externas.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
const port=3199;
const base=`http://localhost:${port}`;
const avisos=[];
const receptor=createServer(async (req,res)=>{
  let body='';for await(const parte of req) body+=parte;
  avisos.push({secret:req.headers['x-kyp-secret'],body:JSON.parse(body)});
  res.writeHead(200,{'Content-Type':'application/json'});res.end('{"ok":true}');
});
await new Promise(resolve=>receptor.listen(0,'127.0.0.1',resolve));
const puertoAvisos=receptor.address().port;
const env={...process.env,APP_PASSWORD:'test-local',WEBHOOK_SECRET:'test-local',ELEVENLABS_PHONE_NUMBER_ID:'no-debe-marcar',ELEVENLABS_API_KEY:'solo-test',ELEVENLABS_AGENT_ID:'solo-test',ELEVENLABS_WEBHOOK_SECRET:'solo-test',FIRECRAWL_API_KEY:'solo-test',ANTHROPIC_API_KEY:'',NEXT_PUBLIC_SUPABASE_URL:'https://invalid.example',SUPABASE_SERVICE_ROLE_KEY:'no-debe-usarse',N8N_WEBHOOK_NOTIFICACIONES:`http://127.0.0.1:${puertoAvisos}`};
const child=spawn(process.execPath,['scripts/demo-local.mjs',`--port=${port}`],{env,stdio:'ignore'});
const headers={authorization:`Basic ${Buffer.from('test:test-local').toString('base64')}`,'Content-Type':'application/json'};
async function get(path){return fetch(base+path,{headers});}
async function post(path,body){return fetch(base+path,{method:'POST',headers,body:JSON.stringify(body)});}
try{
  let listo=false;
  for(let i=0;i<60;i++){try{const r=await get('/api/estado');if(r.ok){listo=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}
  assert.ok(listo,'El servidor local no inició');
  const estado=await(await get('/api/estado')).json();
  assert.equal(estado.almacen,'memoria');
  assert.equal(estado.integraciones.voz,false);
  assert.equal(estado.integraciones.demo_local,true);
  assert.equal(estado.integraciones.elevenlabs_agente,true);
  assert.equal(estado.integraciones.firecrawl,true);
  assert.equal(estado.integraciones.n8n_notificaciones,true);
  const pagina=await(await get('/clabe')).text();
  assert.match(pagina,/Telefonía simulada/);
  assert.match(pagina,/Escuchar demostración de voz pregrabada/);
  const audio=await get('/api/voz/demo/audio');
  assert.equal(audio.status,200);assert.equal(audio.headers.get('content-type'),'audio/mpeg');assert.ok((await audio.arrayBuffer()).byteLength>1000);
  let ultimoProveedor;
  for(const [i,resultado] of ['confirmado','no_reconoce','datos_no_coinciden','sin_respuesta'].entries()){
    const rfc=`ZZX010101AB${i}`;
    const alta=await post('/api/proveedores/lote',{fuentesExternas:false,proveedores:[{rfc,razon_social:`Proveedor Ficticio Voz ${i}`,telefono_registrado:'+525500000001',clabe:'002010077777777771',sitio_web:null,giro_declarado:'Pruebas',monto_anual:1000,factura_folio:'DEMO-42',factura_monto:1000}]});
    assert.equal(alta.status,200);assert.equal((await alta.json()).resultados[0].ok,true);
    const p=(await(await get('/api/proveedores')).json()).find(p=>p.rfc===rfc);assert.ok(p);ultimoProveedor=p;
    const inicio=await post('/api/clabe',{proveedor_id:p.id,clabe_nueva:'012180001234567899',telefono_en_solicitud:'+525599999999'});
    assert.equal(inicio.status,201);const {solicitud,llamada}=await inicio.json();assert.equal(llamada.iniciada,false);assert.equal(llamada.error,undefined);
    assert.equal((await(await get('/api/proveedores')).json()).find(x=>x.id===p.id).estado,'pausado');
    const r=await post(`/api/clabe/${solicitud.id}/simular`,{resultado});assert.equal(r.status,200);
    const evidencia=await r.json();assert.equal(evidencia.simulada,true);assert.equal(evidencia.resultado,resultado);assert.ok(evidencia.transcripcion);
    const duplicado=await post(`/api/clabe/${solicitud.id}/simular`,{resultado});assert.equal((await duplicado.json()).id,evidencia.id);
    const final=(await(await get('/api/proveedores')).json()).find(x=>x.id===p.id);
    assert.equal(final.estado,resultado==='confirmado'?'aprobado':'pausado');assert.equal(final.clabe,resultado==='confirmado'?'012180001234567899':p.clabe);
    const exp=await(await get(`/expediente/${p.id}`)).text();assert.match(exp,/Simulada \(demo\)/);
    const pdf=await get(`/api/expediente/${p.id}/pdf`);assert.equal(pdf.status,200);assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0,4).toString(),'%PDF');
  }
  // Contrato de retorno de n8n; no activa un workflow externo ni duplica la consulta de fuentes.
  const callback=await fetch(base+'/api/webhooks/verificacion',{method:'POST',headers:{'x-kyp-secret':'test-local','Content-Type':'application/json'},body:JSON.stringify({proveedor_id:ultimoProveedor.id,hallazgos:[]})});
  assert.equal(callback.status,200);
  assert.equal((await(await get('/api/proveedores')).json()).find(x=>x.id===ultimoProveedor.id).estado,'pausado');
  // Contrato saliente de avisos y portal del equipo preservados tras el merge.
  const documento=await post('/api/documentos',{proveedor_id:ultimoProveedor.id});assert.equal(documento.status,201);
  const doc=await documento.json();assert.equal(doc.notificada,true);assert.equal(avisos.length,1);assert.equal(avisos[0].secret,'test-local');assert.equal(avisos[0].body.tipo,'solicitud_documentos');assert.ok(avisos[0].body.enlace.startsWith(base+'/portal/'));
  assert.equal((await fetch(base+`/portal/${doc.token}`)).status,200);
  assert.equal((await get('/automatizacion')).status,200);
  console.log('Demo local OK: cuatro resultados, pausa, duplicados, expediente/PDF, MP3 sintético, configuración externa conservada, contratos n8n y portal. Sin telefonía ni servicios externos reales.');
}finally{
  const terminado=new Promise(resolve=>child.once('exit',resolve));
  child.kill('SIGTERM');
  await Promise.race([terminado,new Promise(resolve=>setTimeout(resolve,5000))]);
  receptor.close();
}
