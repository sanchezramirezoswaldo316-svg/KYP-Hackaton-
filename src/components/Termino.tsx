import { GLOSARIO } from "@/lib/explicar.ts";

// Término técnico con su explicación al pasar el cursor o al tocarlo.
export function Termino({ t, children }: { t: keyof typeof GLOSARIO; children?: React.ReactNode }) {
  return (
    <span className="group relative inline-flex items-center">
      <button type="button" className="cursor-help border-b border-dotted border-current">{children ?? t}</button>
      <span aria-hidden className="ml-0.5 text-xs text-acento-2">ⓘ</span>
      <span role="tooltip" className="pointer-events-none invisible absolute bottom-full left-0 z-30 mb-2 w-64 rounded bg-fondo p-3 text-left text-xs font-normal leading-snug text-texto-2 opacity-0 ring-1 ring-borde-fuerte shadow-xl shadow-black/30 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        <strong className="mb-1 block font-mono text-acento-2">{t}</strong>{GLOSARIO[t]}
      </span>
    </span>
  );
}
