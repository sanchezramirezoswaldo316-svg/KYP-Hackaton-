"use client";

import { useEffect, useRef, useState } from "react";
import { Semaforo } from "@/components/Semaforo";
import { explicarHallazgo, FUENTE_SIMPLE, SEMAFORO } from "@/lib/explicar.ts";
import type { Fuente, Hallazgo, Verificacion } from "@/lib/tipos.ts";
import { Icono } from "@/components/Icono";
import { TEXTO_NIVEL } from "@/components/Semaforo";
import { Velocimetro } from "./Velocimetro";

const ORDEN: Fuente[] = ["sat_69b", "sat_69", "ofac", "web", "noticias", "dominio"];
const MARCA = { ok: "OK", info: "INFO", alerta: "ALERTA", peligro: "CRÍTICO" };
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
        <div className="rotulo">Revisando a</div>
        <div className="text-xl font-semibold">{nombre}</div>
      </div>
      <ul className="space-y-2">
        {ORDEN.map((f, i) => {
          const h = hallazgos[f];
          const e = h ? explicarHallazgo(h) : null;
          const enCurso = !h && i === activo;
          return (
            <li key={f} className={`flex items-center gap-3 rounded border p-3 transition-all ${enCurso ? "border-acento/60 bg-acento/10" : h ? "border-borde bg-panel" : "border-borde bg-panel-2 opacity-50"}`}>
              <span className={`flex h-8 w-8 items-center justify-center rounded border ${enCurso ? "border-acento/60 text-acento-2" : "border-borde text-texto-2"}`}><Icono nombre={FUENTE_SIMPLE[f].icono} /></span>
              <div className="min-w-0 flex-1">
                {e ? (
                  <>
                    <div className="font-medium"><span className={`mr-2 font-mono text-[10px] font-semibold tracking-wider ${TEXTO_NIVEL[e.nivel]}`}>{MARCA[e.nivel]}</span>{e.titulo}</div>
                    <div className="text-xs text-texto-2">{e.frase}</div>
                  </>
                ) : (
                  <div className={enCurso ? "font-medium text-acento-2" : "text-texto-3"}>{FUENTE_SIMPLE[f].revisando}</div>
                )}
              </div>
              {enCurso && <span className="h-5 w-5 animate-spin rounded-full border-2 border-acento border-t-transparent" aria-label="revisando" />}
            </li>
          );
        })}
      </ul>
      {error && <p className="text-center text-peligro">{error}</p>}
      {final && (
        <div className="animar-aparecer space-y-3 rounded-md border border-borde bg-panel p-5 text-center">
          <Velocimetro valor={final.puntaje} />
          <Semaforo decision={final.decision} grande />
          <p className="text-texto-2">{SEMAFORO[final.decision].frase}</p>
          {alTerminar?.(final)}
        </div>
      )}
    </div>
  );
}
