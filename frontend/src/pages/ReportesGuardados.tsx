import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { reportesService } from '../services/reportes.service'
import { Reporte } from '../types'
import Swal from 'sweetalert2'
import Modal from '../components/Modal'
import { useTabla } from '../hooks/useTabla'
import Paginador from '../components/Paginador'
import ThOrdenable from '../components/ThOrdenable'

type TipoReporte = Reporte['tipo']

const tipos: { value: TipoReporte; label: string }[] = [
  { value: 'VENTAS_DIA', label: 'Ventas por día' },
  { value: 'VENTAS_MES', label: 'Ventas por mes' },
  { value: 'RANKING_CLIENTES', label: 'Ranking de clientes' },
  { value: 'INVENTARIO', label: 'Inventario' },
  { value: 'PERSONALIZADO', label: 'Personalizado' },
]

interface ReporteForm {
  nombre: string
  descripcion: string
  tipo: TipoReporte
  esPublico: boolean
}

const emptyForm: ReporteForm = { nombre: '', descripcion: '', tipo: 'VENTAS_DIA', esPublico: false }

const valorReporte = (r: Reporte, key: string): string | number => {
  switch (key) {
    case 'nombre': return r.nombre
    case 'tipo': return r.tipo
    case 'usuario': return r.usuario ? `${r.usuario.nombre} ${r.usuario.apellido}` : ''
    case 'visibilidad': return r.esPublico ? 1 : 0
    case 'fecha': return r.createdAt ? new Date(r.createdAt).getTime() : 0
    default: return ''
  }
}

/** Pestaña de la pantalla Reportes que abre cada tipo de reporte guardado. */
const pestanaPorTipo: Record<string, string> = {
  VENTAS_DIA: 'ventas-dia',
  VENTAS_MES: 'ventas-mes',
  RANKING_CLIENTES: 'ranking',
  INVENTARIO: 'inventario',
  PERSONALIZADO: 'ventas-dia',
}

export default function ReportesGuardados() {
  const navigate = useNavigate()
  const [reportes, setReportes] = useState<Reporte[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<ReporteForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() => reportes.filter(r =>
    r.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (r.descripcion && r.descripcion.toLowerCase().includes(search.toLowerCase()))
  ), [reportes, search])

  const tabla = useTabla(filtered, valorReporte)

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      setReportes(await reportesService.getAll())
    } catch {
      Swal.fire('Error', 'No se pudieron cargar los reportes guardados', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await reportesService.create({
        nombre: form.nombre,
        descripcion: form.descripcion || undefined,
        tipo: form.tipo,
        esPublico: form.esPublico,
      })
      Swal.fire('Guardado', 'Reporte guardado correctamente', 'success')
      setModalOpen(false)
      setForm(emptyForm)
      load()
    } catch (err: any) {
      Swal.fire('Error', err?.response?.data?.message?.join?.(', ') || err?.response?.data?.message || 'Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, nombre: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar reporte?',
      text: `Se eliminará "${nombre}"`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    })
    if (result.isConfirmed) {
      try {
        await reportesService.delete(id)
        Swal.fire('Eliminado', 'Reporte eliminado', 'success')
        load()
      } catch {
        Swal.fire('Error', 'No se pudo eliminar', 'error')
      }
    }
  }

  const etiquetaTipo = (t: string) => tipos.find(x => x.value === t)?.label || t

  return (
    <div className="animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Reportes Guardados</h3>
            <p className="text-sm text-slate-400 mt-0.5">{reportes.length} reporte(s) configurado(s) para consulta rápida.</p>
          </div>
          <button onClick={() => { setForm(emptyForm); setModalOpen(true) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Reporte
          </button>
        </div>

        <div className="relative mb-4">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar reporte..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
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
                  <ThOrdenable label="Nombre" col="nombre" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Tipo" col="tipo" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Creado por" col="usuario" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Visibilidad" col="visibilidad" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Fecha" col="fecha" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tabla.visibles.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors duration-150 group">
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-slate-800">{r.nombre}</p>
                      {r.descripcion && <p className="text-xs text-slate-400 mt-0.5">{r.descripcion}</p>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{etiquetaTipo(r.tipo)}</td>
                    <td className="py-3.5 px-4 text-slate-600">{r.usuario ? `${r.usuario.nombre} ${r.usuario.apellido}` : '-'}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${r.esPublico ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                        {r.esPublico ? 'Público' : 'Privado'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{r.createdAt ? new Date(r.createdAt).toLocaleDateString('es-BO') : '-'}</td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button onClick={() => navigate(`/reportes?tab=${pestanaPorTipo[r.tipo] || 'ventas-dia'}`)} title="Abrir reporte"
                        className="px-3 py-1.5 mr-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                        Abrir
                      </button>
                      <button onClick={() => handleDelete(r.id, r.nombre)} title="Eliminar" className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tabla.total === 0 && (
              <div className="text-center py-12 text-slate-400">
                {search ? 'Sin resultados para tu búsqueda' : 'No hay reportes guardados'}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo Reporte">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
            <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Ej. Ventas del mes en curso" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
            <textarea value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" placeholder="Descripción opcional" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de reporte *</label>
            <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value as TipoReporte }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              {tipos.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.esPublico} onChange={e => setForm(p => ({ ...p, esPublico: e.target.checked }))} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
            <span className="text-sm text-slate-700">Compartir con todos los usuarios</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
