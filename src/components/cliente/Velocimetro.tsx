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
  const color = valor > 60 ? "var(--color-peligro)" : valor > 20 ? "var(--color-alerta)" : "var(--color-ok)";

  return (
    <div className="flex flex-col items-center" role="img" aria-label={`Riesgo ${valor} de 100`}>
      <svg viewBox="0 0 200 120" width={tam} height={tam * 0.6}>
        <path d={arco(0, 100)} stroke="var(--color-realce)" strokeWidth="14" fill="none" />
        <path d={arco(0, 20)} stroke="var(--color-ok)" strokeOpacity={valor <= 20 ? 1 : 0.35} strokeWidth="14" fill="none" />
        <path d={arco(20.5, 60)} stroke="var(--color-alerta)" strokeOpacity={valor > 20 && valor <= 60 ? 1 : 0.35} strokeWidth="14" fill="none" />
        <path d={arco(60.5, 100)} stroke="var(--color-peligro)" strokeOpacity={valor > 60 ? 1 : 0.35} strokeWidth="14" fill="none" />
        {[0, 20, 40, 60, 80, 100].map((v) => {
          const a = Math.PI * (1 - v / 100);
          return <line key={v} x1={100 + 66 * Math.cos(a)} y1={100 - 66 * Math.sin(a)} x2={100 + 70 * Math.cos(a)} y2={100 - 70 * Math.sin(a)} stroke="var(--color-texto-3)" strokeWidth="1" />;
        })}
        <g style={{ transform: `rotate(${angulo}deg)`, transformOrigin: "100px 100px", transition: "transform 1.4s cubic-bezier(.2,.8,.2,1)" }}>
          <line x1="100" y1="100" x2="100" y2="34" stroke="var(--color-texto)" strokeWidth="2.5" strokeLinecap="round" />
        </g>
        <circle cx="100" cy="100" r="6" fill="var(--color-panel)" stroke="var(--color-texto)" strokeWidth="2" />
        <text x="18" y="118" fontSize="9" fontFamily="var(--font-mono)" fill="var(--color-texto-3)">0</text>
        <text x="172" y="118" fontSize="9" fontFamily="var(--font-mono)" fill="var(--color-texto-3)">100</text>
      </svg>
      <div className="-mt-1 font-mono text-4xl font-semibold tabular-nums" style={{ color }}>{valor}</div>
      <div className="rotulo">Índice de riesgo · 0–100</div>
    </div>
  );
}
