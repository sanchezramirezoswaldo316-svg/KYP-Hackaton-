type Turno = { rol: "agente" | "proveedor" | null; texto: string };

function turnos(texto: string): Turno[] {
  const partes: Turno[] = [];
  for (const linea of texto.split("\n")) {
    const t = linea.trim();
    if (!t) continue;
    const m = t.match(/^(Agente|Proveedor):\s*(.*)$/i);
    partes.push(m ? { rol: m[1].toLowerCase() === "agente" ? "agente" : "proveedor", texto: m[2] } : { rol: null, texto: t });
  }
  return partes;
}

export function TranscripcionLlamada({ texto }: { texto: string }) {
  const partes = turnos(texto);
  if (partes.length === 0) {
    return <p className="text-sm text-slate-500">Sin transcripción.</p>;
  }
  const conRoles = partes.some((p) => p.rol);
  if (!conRoles) {
    return <p className="whitespace-pre-wrap text-sm text-slate-800">{texto}</p>;
  }
  return (
    <ol className="space-y-2">
      {partes.map((p, i) => {
        const agente = p.rol !== "proveedor";
        return (
          <li key={i} className={`flex ${agente ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${agente ? "rounded-bl-sm bg-white" : "rounded-br-sm bg-emerald-200"}`}>
              <div className="text-[10px] font-semibold uppercase text-slate-500">{agente ? "Agente" : "Proveedor"}</div>
              <p className="whitespace-pre-wrap">{p.texto}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
