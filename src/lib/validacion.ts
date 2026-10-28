// Validaciones de formato de RFC y CLABE.

const RFC_MORAL = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/;
const RFC_FISICA = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/;

export function normalizarRfc(rfc: string): string {
  return rfc.trim().toUpperCase().replace(/[\s-]/g, "");
}

export function rfcValido(rfc: string): boolean {
  const r = normalizarRfc(rfc);
  return RFC_MORAL.test(r) || RFC_FISICA.test(r);
}

// CLABE: 18 dígitos; el último es dígito verificador con pesos 3, 7, 1.
export function clabeValida(clabe: string): boolean {
  if (!/^\d{18}$/.test(clabe)) return false;
  const pesos = [3, 7, 1];
  let suma = 0;
  for (let i = 0; i < 17; i++) suma += (Number(clabe[i]) * pesos[i % 3]) % 10;
  return (10 - (suma % 10)) % 10 === Number(clabe[17]);
}

export function enmascararClabe(clabe: string | null): string {
  if (!clabe) return "—";
  return `•••• •••• ••${clabe.slice(-4)}`;
}

// Normaliza teléfonos mexicanos a formato E.164 (+52...).
export function normalizarTelefono(tel: string): string {
  const digitos = tel.replace(/[^\d+]/g, "");
  if (digitos.startsWith("+")) return digitos;
  if (digitos.length === 10) return `+52${digitos}`;
  return `+${digitos}`;
}
