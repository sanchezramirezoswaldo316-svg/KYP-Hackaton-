import type { Metadata } from "next";
import { BannerModo } from "@/components/BannerModo";
import { Navegacion } from "@/components/Navegacion";
import { Tour } from "@/components/cliente/Tour";
import { ZonaInterna } from "@/components/cliente/ZonaInterna";
import "./globals.css";

export const metadata: Metadata = {
  title: "KYP · Know Your Provider",
  description: "¿Sabes a quién le estás pagando? Revisión automática de proveedores contra el SAT y sanciones internacionales.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <ZonaInterna>
          <Navegacion />
          <BannerModo />
        </ZonaInterna>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <ZonaInterna>
          <Tour />
        </ZonaInterna>
      </body>
    </html>
  );
}
