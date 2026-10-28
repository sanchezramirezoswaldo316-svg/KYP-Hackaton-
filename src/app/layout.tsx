import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { BannerModo } from "@/components/BannerModo";
import { Navegacion } from "@/components/Navegacion";
import { Tour } from "@/components/cliente/Tour";
import { ZonaInterna } from "@/components/cliente/ZonaInterna";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--fuente-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--fuente-mono" });

export const metadata: Metadata = {
  title: "KYP · Know Your Provider",
  description: "¿Sabes a quién le estás pagando? Revisión automática de proveedores contra el SAT y sanciones internacionales.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-fondo font-sans text-sm text-texto antialiased">
        <ZonaInterna>
          <Navegacion />
          <BannerModo />
        </ZonaInterna>
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">{children}</main>
        <ZonaInterna>
          <Tour />
        </ZonaInterna>
      </body>
    </html>
  );
}
