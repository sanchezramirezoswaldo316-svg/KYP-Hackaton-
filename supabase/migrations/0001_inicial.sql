-- Esquema inicial KYP. Ejecutar en Supabase (SQL Editor) o con `supabase db push`.

create extension if not exists pgcrypto;

create table proveedores (
  id uuid primary key default gen_random_uuid(),
  rfc text not null unique,
  razon_social text not null,
  sitio_web text,
  telefono_registrado text not null,
  clabe text,
  giro_declarado text,
  monto_anual numeric not null default 0,
  creado_en timestamptz not null default now()
);

create table verificaciones (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references proveedores(id) on delete cascade,
  fecha timestamptz not null default now(),
  puntaje int not null,
  decision text not null check (decision in ('liberar','revisar','bloquear')),
  bloqueo_directo boolean not null default false,
  motivos jsonb not null default '[]',
  resumen_ia text
);

create table hallazgos (
  id uuid primary key default gen_random_uuid(),
  verificacion_id uuid not null references verificaciones(id) on delete cascade,
  fuente text not null check (fuente in ('sat_69b','sat_69','ofac','web','noticias','dominio')),
  resultado text not null,
  detalle text not null default '',
  fecha_fuente date
);

create table casos (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references proveedores(id) on delete cascade,
  tipo text not null check (tipo in ('alta','clabe')),
  prioridad numeric not null default 0,
  estado text not null default 'pendiente' check (estado in ('pendiente','aprobado','pausado','bloqueado')),
  decidido_por text,
  decidido_en timestamptz,
  creado_en timestamptz not null default now()
);

create table solicitudes_clabe (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references proveedores(id) on delete cascade,
  clabe_nueva text not null,
  estado text not null default 'pausada' check (estado in ('pausada','verificada','rechazada')),
  creado_en timestamptz not null default now()
);

create table llamadas (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references solicitudes_clabe(id) on delete cascade,
  resultado text not null check (resultado in ('confirmado','no_reconoce','datos_no_coinciden','sin_respuesta')),
  transcripcion text not null default '',
  audio_url text,
  creado_en timestamptz not null default now()
);

-- Versiones descargadas de listas oficiales (SAT 69/69-B, OFAC), como evidencia
create table listas_oficiales (
  id uuid primary key default gen_random_uuid(),
  fuente text not null,
  fecha_publicacion date,
  descargado_en timestamptz not null default now(),
  sha256 text not null,
  registros int not null
);

create table bitacora (
  id bigint generated always as identity primary key,
  actor text not null,
  accion text not null,
  entidad text not null,
  entidad_id text,
  detalle jsonb,
  creado_en timestamptz not null default now()
);

-- Seguridad: todo se accede desde el servidor con la service role key.
alter table proveedores enable row level security;
alter table verificaciones enable row level security;
alter table hallazgos enable row level security;
alter table casos enable row level security;
alter table solicitudes_clabe enable row level security;
alter table llamadas enable row level security;
alter table listas_oficiales enable row level security;
alter table bitacora enable row level security;
