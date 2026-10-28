-- Automatización: políticas, documentos del proveedor, alertas y fecha de pago de facturas.

alter table facturas add column if not exists vence date;

create table politicas (
  id uuid primary key default gen_random_uuid(),
  clave text not null unique,
  activa boolean not null default false,
  actualizado_por text,
  actualizado_en timestamptz
);

create table solicitudes_documentos (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references proveedores(id) on delete cascade,
  caso_id uuid references casos(id) on delete set null,
  token text not null unique,
  documento text not null default 'opinion_32d',
  estado text not null default 'enviada' check (estado in ('enviada','recibida','vencida')),
  solicitada_por text not null,
  enviada_en timestamptz not null default now(),
  notificada boolean not null default false,
  recordatorios int not null default 0,
  ultimo_recordatorio_en timestamptz,
  recibida_en timestamptz,
  archivo_nombre text,
  archivo_sha256 text,
  archivo_base64 text,
  analisis jsonb
);
create index on solicitudes_documentos (proveedor_id);

create table alertas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('cambio_lista','documento_recibido','solicitud_vencida','politica_aplicada')),
  proveedor_id uuid references proveedores(id) on delete cascade,
  mensaje text not null,
  creado_en timestamptz not null default now(),
  leida boolean not null default false
);
create index on alertas (creado_en desc);

alter table politicas enable row level security;
alter table solicitudes_documentos enable row level security;
alter table alertas enable row level security;
