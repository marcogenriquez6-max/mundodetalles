import { useEffect, useMemo, useState } from 'react'
import { autorizacionesService } from '../services/autorizaciones.service'
import { Autorizacion } from '../types'
import Swal from 'sweetalert2'
import { useTabla } from '../hooks/useTabla'
import Paginador from '../components/Paginador'
import ThOrdenable from '../components/ThOrdenable'

const estadoStyles: Record<string, string> = {
  PENDIENTE: 'bg-amber-50 text-amber-600',
  APROBADA: 'bg-green-50 text-green-600',
  RECHAZADA: 'bg-red-50 text-red-600',
  EXPIRADA: 'bg-slate-100 text-slate-500',
}

const valorAutorizacion = (a: Autorizacion, key: string): string | number => {
  switch (key) {
    case 'fecha': return new Date(a.createdAt).getTime()
    case 'comprobante': return a.venta?.codigoComprobante || ''
    case 'tipo': return a.tipo
    case 'solicitante': return a.solicitante ? `${a.solicitante.nombre} ${a.solicitante.apellido}` : ''
    case 'aprobador': return a.aprobador ? `${a.aprobador.nombre} ${a.aprobador.apellido}` : ''
    case 'precio': return a.precioAprobado ?? a.precioSolicitado ?? 0
    case 'estado': return a.estado
    default: return ''
  }
}

export default function Autorizaciones() {
  const [autorizaciones, setAutorizaciones] = useState<Autorizacion[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [tipoFilter, setTipoFilter] = useState('')

  useEffect(() => {
    autorizacionesService.getAll()
      .then(setAutorizaciones)
      .catch(() => Swal.fire('Error', 'No se pudo cargar el historial de autorizaciones', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => autorizaciones.filter(a => {
    if (estadoFilter && a.estado !== estadoFilter) return false
    if (tipoFilter && a.tipo !== tipoFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const comp = (a.venta?.codigoComprobante || '').toLowerCase()
      const sol = `${a.solicitante?.nombre || ''} ${a.solicitante?.apellido || ''}`.toLowerCase()
      const apr = `${a.aprobador?.nombre || ''} ${a.aprobador?.apellido || ''}`.toLowerCase()
      if (!comp.includes(q) && !sol.includes(q) && !apr.includes(q) && !a.motivoSolicitud.toLowerCase().includes(q)) return false
    }
    return true
  }), [autorizaciones, estadoFilter, tipoFilter, search])

  const tabla = useTabla(filtered, valorAutorizacion)

  const fmt = (d?: string) => d ? new Date(d).toLocaleString('es-BO') : '-'

  return (
    <div className="animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Historial de Autorizaciones</h3>
            <p className="text-sm text-slate-400 mt-0.5">Registro de solicitudes de descuento, precio especial, crédito y anulación.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 p-4 bg-slate-50 rounded-xl">
          <div className="sm:col-span-1 relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="N° comprobante, usuario, motivo..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
          </div>
          <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all">
            <option value="">Todos los estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="APROBADA">Aprobada</option>
            <option value="RECHAZADA">Rechazada</option>
            <option value="EXPIRADA">Expirada</option>
          </select>
          <select value={tipoFilter} onChange={e => setTipoFilter(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all">
            <option value="">Todos los tipos</option>
            <option value="DESCUENTO_ESPECIAL">Descuento especial</option>
            <option value="PRECIO_ESPECIAL">Precio especial</option>
            <option value="CREDITO">Crédito</option>
            <option value="ANULACION">Anulación</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 bg-slate-50/80">
                  <ThOrdenable label="Fecha" col="fecha" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Comprobante" col="comprobante" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Tipo" col="tipo" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Solicitante" col="solicitante" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Aprobador" col="aprobador" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Precio" col="precio" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} align="right" />
                  <ThOrdenable label="Estado" col="estado" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tabla.visibles.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{fmt(a.createdAt)}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">{a.venta?.codigoComprobante || '-'}</td>
                    <td className="py-3 px-4 text-slate-600">{a.tipo}</td>
                    <td className="py-3 px-4 text-slate-700">{a.solicitante ? `${a.solicitante.nombre} ${a.solicitante.apellido}` : '-'}</td>
                    <td className="py-3 px-4 text-slate-700">{a.aprobador ? `${a.aprobador.nombre} ${a.aprobador.apellido}` : '-'}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      {a.precioSolicitado != null ? `Bs. ${Number(a.precioSolicitado).toFixed(2)}` : '-'}
                      {a.precioAprobado != null && <span className="block text-xs text-green-600">aprobado: Bs. {Number(a.precioAprobado).toFixed(2)}</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${estadoStyles[a.estado] || 'bg-slate-100 text-slate-500'}`}>{a.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tabla.total === 0 && (
              <div className="text-center py-12 text-slate-400">
                {autorizaciones.length === 0 ? 'No hay autorizaciones registradas' : 'Sin resultados para los filtros aplicados'}
              </div>
            )}
            <Paginador
              pagina={tabla.pagina}
              totalPaginas={tabla.totalPaginas}
              total={tabla.total}
              desde={tabla.desde}
              hasta={tabla.hasta}
              onChange={tabla.setPagina}
            />
          </div>
        )}
      </div>
    </div>
  )
}
