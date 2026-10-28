// Canonización conservadora: conserva palabras e iniciales; retira solo formas
// societarias reconocidas al final. No confundir similitud con identidad.
const FINAL_SOCIETARIO = /(?:^| )(?:S ?A(?: DE C ?V)?|S DE R ?L(?: DE C ?V)?|SAPI(?: DE CV)?|S A P I(?: DE C V)?|SAB(?: DE CV)?|SC|S C|AC|A C|LTD|LTDA|INC|CORP|CORPORATION|LLC|LIMITED|GMBH)$/;

export function normalizarNombre(nombre: string): string {
  let n = nombre.toUpperCase().normalize("NFD")
    .replace(/N\u0303/g, "Ñ")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ").trim();
  let previo;
  do { previo = n; n = n.replace(FINAL_SOCIETARIO, "").trim(); } while (n !== previo);
  return n;
}

export function bigramas(s: string): Map<string, number> {
  const m = new Map<string, number>();
  const t = s.replace(/ /g, "");
  for (let i = 0; i < t.length - 1; i++) {
    const b = t.slice(i, i + 2);
    m.set(b, (m.get(b) ?? 0) + 1);
  }
  return m;
}

// Coeficiente de Dice sobre bigramas: 1 = idénticos, 0 = sin nada en común.
export function similitud(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const ba = bigramas(a), bb = bigramas(b);
  let comun = 0, total = 0;
  for (const [k, v] of ba) { comun += Math.min(v, bb.get(k) ?? 0); total += v; }
  for (const v of bb.values()) total += v;
  return total === 0 ? 0 : (2 * comun) / total;
}
