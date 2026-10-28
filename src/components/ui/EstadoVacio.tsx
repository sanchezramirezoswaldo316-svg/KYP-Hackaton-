export function EstadoVacio({ titulo, texto, accion }: { titulo: string; texto: string; accion?: React.ReactNode }) {
  return <div className="border border-dashed border-borde-fuerte bg-lienzo px-4 py-6 text-center"><p className="text-sm font-semibold">{titulo}</p><p className="mt-1 text-sm text-tinta-2">{texto}</p>{accion && <div className="mt-3">{accion}</div>}</div>;
}
