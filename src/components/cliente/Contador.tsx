"use client";

import { useEffect, useRef, useState } from "react";

// Número que "sube" desde 0 cuando aparece en pantalla.
export function Contador({ valor, formato = "numero", duracion = 1500 }: { valor: number; formato?: "numero" | "millones" | "porcentaje" | "horas"; duracion?: number }) {
  const [v, setV] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducir) { setV(valor); return; }
    let raf = 0;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const t0 = performance.now();
      const paso = (t: number) => {
        const k = Math.min(1, (t - t0) / duracion);
        setV(valor * (1 - Math.pow(1 - k, 3)));
        if (k < 1) raf = requestAnimationFrame(paso);
      };
      raf = requestAnimationFrame(paso);
    });
    if (ref.current) obs.observe(ref.current);
    return () => { obs.disconnect(); cancelAnimationFrame(raf); };
  }, [valor, duracion]);

  const texto =
    formato === "millones" ? `$${(v / 1_000_000).toLocaleString("es-MX", { maximumFractionDigits: 1 })} M`
    : formato === "porcentaje" ? `${Math.round(v)}%`
    : formato === "horas" ? `${Math.round(v).toLocaleString("es-MX")} h`
    : Math.round(v).toLocaleString("es-MX");
  return <span ref={ref}>{texto}</span>;
}
