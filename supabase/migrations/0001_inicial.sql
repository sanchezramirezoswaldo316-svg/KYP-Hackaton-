-- Esquema KYP. Ejecutar en Supabase (SQL Editor) o con `supabase db push`.

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
  estado text not null default 'pendiente' check (estado in ('pendiente','aprobado','en_revision','pausado','bloqueado')),
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
  hallazgos jsonb not null default '[]',
  resumen text not null default '',
  resumen_origen text not null default 'reglas' check (resumen_origen in ('ia','reglas'))
);
create index on verificaciones (proveedor_id, fecha desc);

create table solicitudes_clabe (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references proveedores(id) on delete cascade,
  clabe_nueva text not null,
  telefono_en_solicitud text,
  estado text not null default 'pausada' check (estado in ('pausada','en_llamada','verificada','rechazada')),
  creado_en timestamptz not null default now()
);

create table casos (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references proveedores(id) on delete cascade,
  tipo text not null check (tipo in ('alta','clabe')),
  prioridad numeric not null default 0,
  estado text not null default 'pendiente' check (estado in ('pendiente','aprobado','pausado','bloqueado')),
  decision_sugerida text not null check (decision_sugerida in ('liberar','revisar','bloquear')),
  motivo text not null default '',
  solicitud_id uuid references solicitudes_clabe(id) on delete set null,
  decidido_por text,
  decidido_en timestamptz,
  comentario text,
  creado_en timestamptz not null default now()
);
create index on casos (estado, prioridad desc);

create table facturas (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references proveedores(id) on delete cascade,
  folio text not null,
  monto numeric not null,
  fecha date not null default current_date
);

create table llamadas (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references solicitudes_clabe(id) on delete cascade,
  conversation_id text,
  resultado text not null check (resultado in ('confirmado','no_reconoce','datos_no_coinciden','sin_respuesta')),
  transcripcion text not null default '',
  resumen text,
  simulada boolean not null default false,
  creado_en timestamptz not null default now()
);

create table bitacora (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  accion text not null,
  entidad text not null,
  entidad_id text,
  detalle jsonb,
  creado_en timestamptz not null default now()
);

-- Todo se accede desde el servidor con la service role key; sin políticas, el acceso anónimo queda bloqueado.
alter table proveedores enable row level security;
alter table verificaciones enable row level security;
alter table solicitudes_clabe enable row level security;
alter table casos enable row level security;
alter table facturas enable row level security;
alter table llamadas enable row level security;
alter table bitacora enable row level security;
