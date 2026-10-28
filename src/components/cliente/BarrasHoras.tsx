"use client";

import { useEffect, useState } from "react";
import { Icono } from "@/components/Icono";
import { Contador } from "./Contador";

// La barra "con KYP" empieza igual que la manual y se encoge hasta su tamaño real.
export function BarrasHoras({ manual, kyp }: { manual: number; kyp: number }) {
  const [listo, setListo] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setListo(true), 500);
    return () => clearTimeout(t);
  }, []);
  const pct = manual ? Math.max((kyp / manual) * 100, 1) : 0;
  const ahorro = manual ? Math.round((1 - kyp / manual) * 100) : 0;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="flex w-28 items-center gap-1.5 text-[13px] text-texto-2"><Icono nombre="personas" className="h-3.5 w-3.5" />A mano</span>
        <div className="h-6 flex-1 rounded-sm bg-realce"><div className="h-6 rounded-sm bg-texto-3/60" style={{ width: manual ? "100%" : "0%" }} /></div>
        <span className="w-24 text-right font-mono font-semibold tabular-nums"><Contador valor={manual} formato="horas" /></span>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex w-28 items-center gap-1.5 text-[13px] text-texto-2"><Icono nombre="rayo" className="h-3.5 w-3.5 text-acento-2" />Con KYP</span>
        <div className="h-6 flex-1 rounded-sm bg-realce"><div className="h-6 rounded-sm bg-acento transition-all duration-[2000ms] ease-out" style={{ width: listo ? `${pct}%` : manual ? "100%" : "0%" }} /></div>
        <span className="w-24 text-right font-mono font-semibold tabular-nums"><Contador valor={kyp} formato="horas" /></span>
      </div>
      {ahorro > 0 && <p className={`text-center font-mono text-lg font-semibold text-acento-2 transition-opacity duration-700 ${listo ? "opacity-100" : "opacity-0"}`}>{ahorro}% menos horas de trabajo</p>}
    </div>
  );
}
