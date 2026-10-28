// Carga masiva por CSV (Samuel).
export default function Carga() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">Carga masiva de proveedores</h1>
      <p className="text-sm text-slate-600">
        Columnas: rfc, razon_social, sitio_web, telefono_registrado, clabe, giro_declarado, monto_anual.
      </p>
      {/* TODO(Samuel): input de archivo, lectura del CSV y POST a /api/proveedores con progreso */}
    </div>
  );
}
