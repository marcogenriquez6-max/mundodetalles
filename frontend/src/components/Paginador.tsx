interface PaginadorProps {
  pagina: number
  totalPaginas: number
  total: number
  desde: number
  hasta: number
  onChange: (pagina: number) => void
}

/** Controles de paginación reutilizables para los listados. */
export default function Paginador({ pagina, totalPaginas, total, desde, hasta, onChange }: PaginadorProps) {
  if (total === 0) return null
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 flex-wrap">
      <p className="text-xs text-slate-500">
        Mostrando <b className="text-slate-700">{desde}</b>–<b className="text-slate-700">{hasta}</b> de{' '}
        <b className="text-slate-700">{total}</b>
      </p>
      <div className="flex items-center gap-1">
        <button
          disabled={pagina <= 1}
          onClick={() => onChange(pagina - 1)}
          className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
        >
          Anterior
        </button>
        <span className="text-sm text-slate-600 px-2">
          {pagina} / {totalPaginas}
        </span>
        <button
          disabled={pagina >= totalPaginas}
          onClick={() => onChange(pagina + 1)}
          className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}
