"use client";

import { useEffect, useRef, useState } from "react";
import { Semaforo } from "@/components/Semaforo";
import { explicarHallazgo, FUENTE_SIMPLE, SEMAFORO } from "@/lib/explicar.ts";
import type { Fuente, Hallazgo, Verificacion } from "@/lib/tipos.ts";
import { Velocimetro } from "./Velocimetro";

const ORDEN: Fuente[] = ["sat_69b", "sat_69", "ofac", "web", "noticias", "dominio"];
const MARCA = { ok: "OK", info: "Info", alerta: "Revisar", peligro: "Alto" };
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Muestra la verificación como un "escaneo" paso a paso. Los resultados son los reales;
// la animación solo marca el ritmo para que se entienda qué se revisa.
export function Escaner({ nombre, ejecutar, alTerminar }: {
  nombre: string;
  ejecutar: () => Promise<{ verificacion: Omit<Verificacion, "id"> | Verificacion }>;
  alTerminar?: (v: Omit<Verificacion, "id"> | Verificacion) => React.ReactNode;
}) {
  const [activo, setActivo] = useState(0);
  const [hallazgos, setHallazgos] = useState<Partial<Record<Fuente, Hallazgo>>>({});
  const [final, setFinal] = useState<Omit<Verificacion, "id"> | Verificacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const iniciado = useRef(false);

  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;
    const ritmo = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 650;
    const promesa = ejecutar();
    (async () => {
      try {
        let v: Awaited<typeof promesa>["verificacion"] | null = null;
        for (let i = 0; i < ORDEN.length; i++) {
          setActivo(i);
          await espera(ritmo);
          v ??= (await promesa).verificacion;
          const h = v.hallazgos.find((x) => x.fuente === ORDEN[i]);
          setHallazgos((prev) => ({ ...prev, [ORDEN[i]]: h ?? { fuente: ORDEN[i], resultado: "no_consultado", detalle: "", fecha_fuente: null } }));
        }
        setActivo(ORDEN.length);
        await espera(ritmo / 2);
        setFinal(v);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [ejecutar]);

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="text-sm uppercase tracking-wide text-tinta-3">Revisando a</div>
        <div className="text-xl font-semibold">{nombre}</div>
      </div>
      <ul className="space-y-2">
        {ORDEN.map((f, i) => {
          const h = hallazgos[f];
          const e = h ? explicarHallazgo(h) : null;
          const enCurso = !h && i === activo;
          return (
            <li key={f} className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${enCurso ? "border-acento bg-hover" : h ? "border-borde bg-white" : "border-borde bg-superficie opacity-50"}`}>
              <div className="min-w-0 flex-1">
                {e ? (
                  <>
                    <div className="font-medium">{MARCA[e.nivel]} {e.titulo}</div>
                    <div className="text-xs text-tinta-3">{e.frase}</div>
                  </>
                ) : (
                  <div className={enCurso ? "font-medium text-tinta" : "text-tinta-3"}>{FUENTE_SIMPLE[f].revisando}</div>
                )}
              </div>
              {enCurso && <span className="h-5 w-5 animate-spin rounded-full border-2 border-acento border-t-transparent" aria-label="revisando" />}
            </li>
          );
        })}
      </ul>
      {error && <p className="text-center text-error">{error}</p>}
      {final && (
        <div className="animar-aparecer space-y-3 rounded-xl border border-borde bg-white p-5 text-center">
          <Velocimetro valor={final.puntaje} />
          <Semaforo decision={final.decision} grande />
          <p className="text-tinta">{SEMAFORO[final.decision].frase}</p>
          {alTerminar?.(final)}
        </div>
      )}
    </div>
  );
}
