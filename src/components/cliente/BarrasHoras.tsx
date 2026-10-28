"use client";

import { useEffect, useState } from "react";
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
        <span className="w-24 text-sm">A mano</span>
        <div className="h-7 flex-1 rounded bg-superficie"><div className="h-7 rounded bg-seleccion" style={{ width: manual ? "100%" : "0%" }} /></div>
        <span className="w-24 text-right font-semibold"><Contador valor={manual} formato="horas" /></span>
      </div>
      <div className="flex items-center gap-3">
        <span className="w-24 text-sm">Con KYP</span>
        <div className="h-7 flex-1 rounded bg-superficie"><div className="h-7 rounded bg-marca transition-all duration-[2000ms] ease-out" style={{ width: listo ? `${pct}%` : manual ? "100%" : "0%" }} /></div>
        <span className="w-24 text-right font-semibold"><Contador valor={kyp} formato="horas" /></span>
      </div>
      {ahorro > 0 && <p className={`text-center text-lg font-semibold text-tinta transition-opacity duration-700 ${listo ? "opacity-100" : "opacity-0"}`}>{ahorro}% menos horas de trabajo</p>}
    </div>
  );
}
