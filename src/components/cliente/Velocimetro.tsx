"use client";

import { useEffect, useState } from "react";

// Puntaje 0-100 con una barra monocroma. La barra sube al montarse.
export function Velocimetro({ valor, tam = 220 }: { valor: number; tam?: number }) {
  const [actual, setActual] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setActual(Math.max(0, Math.min(100, valor))), 150);
    return () => clearTimeout(t);
  }, [valor]);

  return (
    <div className="w-full max-w-[320px]" role="img" aria-label={`Riesgo ${valor} de 100`} style={{ minWidth: Math.min(tam, 320) }}>
      <div className="mb-2 flex items-end justify-between"><span className="text-3xl font-semibold tabular-nums">{valor}</span><span className="text-xs text-tinta-3">de 100</span></div>
      <div className="relative h-1.5 rounded-sm bg-seleccion">
        <div className="h-full rounded-sm bg-tinta transition-[width] duration-700 ease-out" style={{ width: `${actual}%` }} />
        <span className="absolute -top-1 h-3.5 w-px bg-borde-fuerte" style={{ left: "20%" }} />
        <span className="absolute -top-1 h-3.5 w-px bg-borde-fuerte" style={{ left: "60%" }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-tinta-3"><span>0</span><span>20</span><span>60</span><span>100</span></div>
    </div>
  );
}
