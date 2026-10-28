"use client";

import { User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// 30 auditores que se desvanecen hasta quedar una sola persona.
export function Personas() {
  const [fase, setFase] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      setTimeout(() => setFase(1), 600);
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
      <div className="grid grid-cols-10 gap-1.5" aria-hidden>
        {Array.from({ length: 30 }, (_, i) => {
          const ana = i === 0;
          return (
            <span
              key={i}
              className={`flex h-7 w-7 items-center justify-center rounded-sm border transition-all duration-700 sm:h-8 sm:w-8 ${ana ? "border-acento bg-acento/15 text-acento-2" : "border-borde-fuerte bg-panel-2 text-texto-2"} ${fase && !ana ? "scale-75 opacity-15" : ""} ${fase && ana ? "animar-latido" : ""}`}
              style={{ transitionDelay: fase && !ana ? `${(30 - i) * 60}ms` : "0ms" }}
            >
              <User className="h-4 w-4" strokeWidth={1.75} />
            </span>
          );
        })}
      </div>
      <div className="text-center sm:text-left">
        <div className={`text-lg transition-opacity duration-500 ${fase ? "opacity-40 line-through" : ""}`}>Antes: <strong className="font-mono">30 auditores</strong></div>
        <div className={`font-mono text-2xl font-bold text-acento-2 transition-opacity delay-[2200ms] duration-700 ${fase ? "opacity-100" : "opacity-0"}`}>Con KYP: 1 gestora</div>
        <p className={`max-w-xs text-sm text-texto-2 transition-opacity delay-[2600ms] duration-700 ${fase ? "opacity-100" : "opacity-0"}`}>El sistema revisa a todos; Ana solo decide los casos dudosos.</p>
      </div>
    </div>
  );
}
