"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Refresca la página cada pocos segundos mientras algo está en curso (por ejemplo, una llamada).
export function AutoRefrescar({ activo, cadaMs = 3000 }: { activo: boolean; cadaMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!activo) return;
    const t = setInterval(() => router.refresh(), cadaMs);
    return () => clearInterval(t);
  }, [activo, cadaMs, router]);
  return null;
}
