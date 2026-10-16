import type { OrdenEstado } from '../hooks/useTabla'

interface ThOrdenableProps {
  label: string
  col: string
  orden: OrdenEstado | null
  onOrdenar: (col: string) => void
  align?: 'left' | 'right' | 'center'
}

/** Encabezado de tabla clicable para ordenar por esa columna. */
export default function ThOrdenable({ label, col, orden, onOrdenar, align = 'left' }: ThOrdenableProps) {
  const activo = orden?.key === col
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
  return (
    <th className={`py-3 px-4 font-semibold text-xs uppercase tracking-wider ${alignClass}`}>
      <button
        onClick={() => onOrdenar(col)}
        className={`inline-flex items-center gap-1 hover:text-slate-700 transition-colors ${align === 'right' ? 'flex-row-reverse' : ''}`}
      >
        {label}
        <span className={`text-[10px] ${activo ? 'text-blue-600' : 'text-slate-300'}`}>
          {activo ? (orden!.dir === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  )
}
