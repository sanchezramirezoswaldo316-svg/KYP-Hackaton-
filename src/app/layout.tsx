import type { Metadata } from "next";
import { BannerModo } from "@/components/BannerModo";
import { Navegacion } from "@/components/Navegacion";
import "./globals.css";

export const metadata: Metadata = {
  title: "KYP · Know Your Provider",
  description: "Verificación de proveedores con gestión por excepción",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <Navegacion />
        <BannerModo />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
