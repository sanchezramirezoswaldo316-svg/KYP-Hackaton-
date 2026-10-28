"use client";

import { useEffect, useState } from "react";

// Medidor de riesgo 0-100: verde (0-20), amarillo (21-60), rojo (61-100). La aguja sube al montarse.
export function Velocimetro({ valor, tam = 220 }: { valor: number; tam?: number }) {
  const [actual, setActual] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setActual(Math.max(0, Math.min(100, valor))), 150);
    return () => clearTimeout(t);
  }, [valor]);

  const arco = (desde: number, hasta: number) => {
    const a = (v: number) => Math.PI * (1 - v / 100);
    const p = (v: number) => [100 + 80 * Math.cos(a(v)), 100 - 80 * Math.sin(a(v))];
    const [x1, y1] = p(desde), [x2, y2] = p(hasta);
    return `M ${x1} ${y1} A 80 80 0 0 1 ${x2} ${y2}`;
  };
  const angulo = -90 + (actual / 100) * 180;
  const color = valor > 60 ? "#dc2626" : valor > 20 ? "#d97706" : "#059669";

  return (
    <div className="flex flex-col items-center" role="img" aria-label={`Riesgo ${valor} de 100`}>
      <svg viewBox="0 0 200 120" width={tam} height={tam * 0.6}>
        <path d={arco(0, 20)} stroke="#10b981" strokeWidth="18" fill="none" />
        <path d={arco(20.5, 60)} stroke="#f59e0b" strokeWidth="18" fill="none" />
        <path d={arco(60.5, 100)} stroke="#ef4444" strokeWidth="18" fill="none" />
        <g style={{ transform: `rotate(${angulo}deg)`, transformOrigin: "100px 100px", transition: "transform 1.4s cubic-bezier(.2,.8,.2,1)" }}>
          <line x1="100" y1="100" x2="100" y2="34" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
        </g>
        <circle cx="100" cy="100" r="8" fill="#0f172a" />
        <text x="18" y="118" fontSize="10" fill="#64748b">0</text>
        <text x="172" y="118" fontSize="10" fill="#64748b">100</text>
      </svg>
      <div className="-mt-1 text-4xl font-bold" style={{ color }}>{valor}</div>
      <div className="text-xs text-slate-500">nivel de riesgo (de 0 a 100)</div>
    </div>
  );
}
