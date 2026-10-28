import { createHash } from 'node:crypto';
export const VERSION = 'sat-2';
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
export const normalizarRfc = s => s.trim().toUpperCase();
export function fechaIso(s) {
  if (!s?.trim()) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s.trim());
  if (!m) throw new Error(`Fecha inválida: ${s}`);
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(`${iso}T00:00:00Z`);
  if (!Number(m[3]) || !Number.isFinite(+d) || d.toISOString().slice(0, 10) !== iso) throw new Error(`Fecha inválida: ${s}`);
  return iso;
}
export function parseCsv(text) {
  text = text.replace(/^\uFEFF/, '');
  if (!text.trim() || /<\s*(?:!doctype|html|body|head)\b/i.test(text)) throw new Error('CSV vacío o respuesta HTML');
  const rows = []; let row = [], field = '', state = 'start';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (state === 'quoted') {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') state = 'closed'; else field += c;
    } else if (c === ',' || c === '\n' || c === '\r') {
      row.push(field); field = ''; state = 'start';
      if (c !== ',') { if (c === '\r' && text[i + 1] === '\n') i++; if (row.some(x => x.trim())) rows.push(row); row = []; }
    } else if (c === '"' && state === 'start') state = 'quoted';
    else { if (state === 'closed' || c === '"') throw new Error('Estructura CSV inválida'); field += c; state = 'plain'; }
  }
  if (state === 'quoted') throw new Error('Comillas incompletas');
  if (field || row.length || state === 'closed') { row.push(field); rows.push(row); }
  return rows;
}
const ESTADOS = {presunto:'presunto', definitivo:'definitivo', desvirtuado:'desvirtuado', 'sentencia favorable':'sentencia_favorable'};
export const COLUMNAS_DOF = {
  presunto:'Publicación DOF presuntos', desvirtuado:'Publicación DOF desvirtuados',
  definitivo:'Publicación DOF definitivos', sentencia_favorable:'Publicación DOF sentencia favorable',
};
/**
 * @param {Uint8Array} bytes
 * @param {{ tipo: string, url: string, supuesto?: string, descargado_en: string }} opciones
 */
export function importarSat(bytes, {tipo, url, supuesto, descargado_en}) {
  let text;
  try { text = new TextDecoder('utf-8', {fatal:true}).decode(bytes); }
  catch { text = new TextDecoder('windows-1252').decode(bytes); }
  const rows = parseCsv(text);
  const start = rows.findIndex(r => r.some(c => norm(c) === 'rfc'));
  if (start < 0) throw new Error('Encabezado RFC ausente');
  const headers = rows[start].map(norm);
  const col = name => { const matches = headers.flatMap((h,i) => h === norm(name) ? [i] : []); if (matches.length !== 1) throw new Error(`Encabezado inesperado/ausente: ${name}`); return matches[0]; };
  const irfc = col('RFC');
  const inombre = tipo === '69b' ? col('Nombre del Contribuyente') : null;
  const estado = tipo === '69b' ? col('Situación del contribuyente') : null;
  const fechas = tipo === '69b' ? Object.fromEntries(Object.entries(COLUMNAS_DOF).map(([e,c])=>[e,col(c)])) : {publicacion:col('Fecha de primera publicación')};
  if (tipo !== '69b' && !['no_localizado','exigible','sentencia'].includes(supuesto)) throw new Error('Supuesto fuera del MVP');
  /** @type {Record<string, any>} */
  const rfc = {}; const errores = []; let validos=0, duplicados=0;
  for (const [i,row] of rows.slice(start+1).entries()) {
    try {
      if (row.length !== headers.length) throw new Error('Número de columnas inválido');
      const key = normalizarRfc(row[irfc]);
      if (!/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(key)) throw new Error('RFC inválido');
      // Validar todas las fechas reconocidas, no solo la del estado seleccionado.
      for (const index of Object.values(fechas)) fechaIso(row[index]);
      let value;
      if (tipo === '69b') {
        const e = ESTADOS[norm(row[estado])];
        if (!e) throw new Error(`Estatus desconocido: ${row[estado]}`);
        if (!row[inombre].trim()) throw new Error('Nombre vacío');
        value = [e,row[inombre].trim(),fechaIso(row[fechas[e]])];
        const eventos = Object.values(fechas).map(index => fechaIso(row[index])).filter(Boolean);
        if (value[2] && eventos.some(f => f > value[2])) throw new Error(`Ambigüedad: evento posterior al estatus declarado para ${key}`);
        const old = rfc[key];
        if (old) {
          if (JSON.stringify(old) === JSON.stringify(value)) duplicados++;
          else if (!old[2] || !value[2] || old[2] === value[2] || old[1] !== value[1]) throw new Error(`Ambigüedad de eventos para ${key}`);
          else if (old[2] > value[2]) { validos++; continue; }
        }
        rfc[key] = value;
      } else {
        value = [supuesto,fechaIso(row[fechas.publicacion])];
        if (rfc[key]) {
          if (JSON.stringify(rfc[key][0]) !== JSON.stringify(value)) throw new Error(`Ambigüedad de publicación para ${key}`);
          duplicados++;
        } else rfc[key] = [value];
      }
      validos++;
    } catch (e) { errores.push({fila:start+i+2, causa:e.message}); }
  }
  const conteos = {validos, rechazados:errores.length, duplicados};
  if (errores.length || !validos) { const e = new Error(`Importación rechazada: ${JSON.stringify({conteos,errores})}`); e.reporte={conteos,errores}; throw e; }
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const m = /actualizada al (\d{1,2}) de (\w+) de (\d{4})/i.exec(norm(rows.slice(0,start).flat().join(' ')));
  const actualizacion = m ? fechaIso(`${m[1].padStart(2,'0')}/${String(meses.indexOf(m[2])+1).padStart(2,'0')}/${m[3]}`) : null;
  return {fuente:`SAT · Art. ${tipo === '69b' ? '69-B' : '69'} CFF`,url,actualizacion,publicado_en:actualizacion,descargado_en,sha256:createHash('sha256').update(bytes).digest('hex'),parser_version:VERSION,conteos,registros:Object.keys(rfc).length,rfc};
}
export function agrupar69(listas) {
  /** @type {Record<string, any>} */
  const rfc = {};
  for (const lista of listas) for (const [key,values] of Object.entries(lista.rfc)) {
    rfc[key] ??= [];
    for (const v of values) if (!rfc[key].some(x=>x[0]===v[0])) rfc[key].push(v);
    rfc[key].sort((a,b)=>a[0].localeCompare(b[0]));
  }
  return {fuente:'SAT · Listados Art. 69 CFF',parser_version:VERSION,descargado_en:listas[0].descargado_en,listas:listas.map(({rfc: omitido,...meta})=>{ void omitido; return meta; }),registros:Object.keys(rfc).length,rfc};
}
