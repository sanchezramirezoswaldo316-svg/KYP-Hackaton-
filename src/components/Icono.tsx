// Íconos de línea (Lucide) por nombre. Los textos del servidor y de lib/ guardan solo el nombre,
// así se pueden usar sin depender de React.
import {
  Activity, AlertTriangle, ArrowLeft, ArrowRight, Ban, Banknote, Bell, Bot, Building2, Calendar, CheckCircle2,
  CircleDot, Clock, Cpu, CreditCard, Database, FileCheck2, FileSearch, FileText, Fingerprint, Gauge, Globe,
  Hourglass, Inbox, Landmark, LayoutDashboard, Link2, ListChecks, Lock, Mail, Newspaper, PauseCircle, Phone,
  PhoneCall, PlayCircle, Radar, Receipt, RefreshCw, Scale, ScanSearch, Search, Settings2, Shield, ShieldAlert,
  ShieldCheck, ShieldX, Sparkles, Upload, User, Users, Workflow, XCircle, Zap, type LucideIcon,
} from "lucide-react";

export const ICONOS = {
  actividad: Activity, alerta: AlertTriangle, atras: ArrowLeft, adelante: ArrowRight, prohibido: Ban, dinero: Banknote,
  campana: Bell, robot: Bot, empresa: Building2, calendario: Calendar, ok: CheckCircle2, punto: CircleDot, reloj: Clock,
  cpu: Cpu, tarjeta: CreditCard, datos: Database, documentoOk: FileCheck2, documentoBuscar: FileSearch, documento: FileText,
  huella: Fingerprint, velocimetro: Gauge, web: Globe, espera: Hourglass, bandeja: Inbox, banco: Landmark,
  panel: LayoutDashboard, enlace: Link2, lista: ListChecks, candado: Lock, correo: Mail, noticias: Newspaper,
  pausa: PauseCircle, telefono: Phone, llamada: PhoneCall, reproducir: PlayCircle, radar: Radar, factura: Receipt,
  repetir: RefreshCw, balanza: Scale, escanear: ScanSearch, buscar: Search, ajustes: Settings2, escudo: Shield,
  escudoAlerta: ShieldAlert, escudoOk: ShieldCheck, escudoX: ShieldX, ia: Sparkles, subir: Upload, persona: User,
  personas: Users, flujo: Workflow, error: XCircle, rayo: Zap,
} satisfies Record<string, LucideIcon>;

export type NombreIcono = keyof typeof ICONOS;

export function Icono({ nombre, className = "h-4 w-4", trazo = 1.75 }: { nombre: NombreIcono; className?: string; trazo?: number }) {
  const C = ICONOS[nombre];
  return <C className={`shrink-0 ${className}`} strokeWidth={trazo} aria-hidden />;
}
