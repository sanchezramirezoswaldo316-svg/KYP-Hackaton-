// Normalización y similitud de nombres para comparar razones sociales contra listas de sanciones.

const SUFIJOS = new Set([
  "SA", "DE", "CV", "S", "RL", "SAPI", "SAB", "SC", "SPR", "AC", "IAP", "SOFOM", "ENR", "ER",
  "LTD", "LTDA", "INC", "CO", "CORP", "CORPORATION", "LLC", "LIMITED", "COMPANY", "GMBH", "THE", "Y", "AND", "EL", "LA", "LOS", "LAS",
]);

export function normalizarNombre(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !SUFIJOS.has(t))
    .join(" ");
}

function bigramas(s: string): Map<string, number> {
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
  if (a === b) return 1;
  const ba = bigramas(a), bb = bigramas(b);
  let comun = 0, total = 0;
  for (const [k, v] of ba) { comun += Math.min(v, bb.get(k) ?? 0); total += v; }
  for (const v of bb.values()) total += v;
  return total === 0 ? 0 : (2 * comun) / total;
}
