import { useEffect, useMemo, useRef, useState } from 'react'
import { Cliente } from '../types'

interface ClienteBuscadorProps {
  clientes: Cliente[]
  value: string
  onChange: (id: string, cliente?: Cliente) => void
  placeholder?: string
  inputClassName?: string
  onNuevo?: () => void
}

const inputDefault =
  'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all'

/**
 * Buscador de clientes (combobox): escribe para filtrar por nombre, apellido o
 * documento. Opcionalmente muestra un botón "+ Nuevo" para crear uno al vuelo.
 */
export default function ClienteBuscador({
  clientes,
  value,
  onChange,
  placeholder = 'Buscar cliente por nombre o documento…',
  inputClassName = inputDefault,
  onNuevo,
}: ClienteBuscadorProps) {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const contenedorRef = useRef<HTMLDivElement>(null)

  const seleccionado = useMemo(() => clientes.find((c) => c.id === value), [clientes, value])
  const nombreSeleccionado = seleccionado ? `${seleccionado.nombre} ${seleccionado.apellido}` : ''

  useEffect(() => {
    setTexto(nombreSeleccionado)
  }, [nombreSeleccionado])

  useEffect(() => {
    const cerrar = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', cerrar)
    return () => document.removeEventListener('mousedown', cerrar)
  }, [])

  const filtrados = useMemo(() => {
    const q = texto.trim().toLowerCase()
    const escribiendo = q && q !== nombreSeleccionado.toLowerCase()
    const base = escribiendo
      ? clientes.filter(
          (c) =>
            `${c.nombre} ${c.apellido}`.toLowerCase().includes(q) ||
            c.numeroDocumento.toLowerCase().includes(q),
        )
      : clientes
    return base.slice(0, 40)
  }, [clientes, texto, nombreSeleccionado])

  const seleccionar = (c?: Cliente) => {
    onChange(c?.id || '', c)
    setTexto(c ? `${c.nombre} ${c.apellido}` : '')
    setAbierto(false)
  }

  return (
    <div className="flex gap-2">
      <div ref={contenedorRef} className="relative flex-1">
        <input
          type="text"
          value={texto}
          onChange={(e) => {
            const v = e.target.value
            setTexto(v)
            setAbierto(true)
            if (v.trim() === '') onChange('')
          }}
          onFocus={() => setAbierto(true)}
          placeholder={placeholder}
          className={inputClassName}
          autoComplete="off"
        />
        {abierto && (
          <div className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg py-1">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                seleccionar(undefined)
              }}
              className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:bg-slate-50 italic"
            >
              Sin cliente
            </button>
            {filtrados.map((c) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  seleccionar(c)
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between gap-3 ${c.id === value ? 'bg-blue-50/70' : ''}`}
              >
                <span className="font-medium text-slate-700 truncate">
                  {c.nombre} {c.apellido}
                </span>
                <span className="shrink-0 text-xs text-slate-400 font-mono">{c.numeroDocumento}</span>
              </button>
            ))}
            {filtrados.length === 0 && (
              <p className="px-3 py-2 text-sm text-slate-400">Sin resultados</p>
            )}
          </div>
        )}
      </div>
      {onNuevo && (
        <button
          type="button"
          onClick={onNuevo}
          title="Registrar un cliente nuevo"
          className="shrink-0 flex items-center gap-1 px-3 rounded-xl border border-blue-200 text-blue-600 text-sm font-medium bg-blue-50/50 hover:bg-blue-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo
        </button>
      )}
    </div>
  )
}
