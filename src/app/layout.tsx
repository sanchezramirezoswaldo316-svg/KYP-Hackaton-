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
      <body className="min-h-screen antialiased">
        <ZonaInterna>
          <Navegacion />
          <BannerModo />
        </ZonaInterna>
        <main className="app-main min-h-screen px-4 py-6 sm:px-6 lg:ml-[232px] lg:px-8 lg:py-8">{children}</main>
        <ZonaInterna>
          <Tour />
        </ZonaInterna>
      </body>
    </html>
  );
}
