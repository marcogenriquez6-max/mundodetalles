import { useEffect, useMemo, useState } from 'react'
import { cotizacionesService } from '../services/cotizaciones.service'
import { Cotizacion, Producto } from '../types'
import Swal from 'sweetalert2'
import Modal from '../components/Modal'
import { authService } from '../services/auth.service'
import api from '../services/api'
import { useTabla } from '../hooks/useTabla'
import Paginador from '../components/Paginador'
import ThOrdenable from '../components/ThOrdenable'
import { formatoFechaSolo } from '../utils/fechas'

interface ClienteOption {
  id: string
  nombre: string
  apellido?: string
}

interface DetalleForm {
  productoId: string
  cantidad: number
  precioUnitario: number
}

const estadoBadge = (estado: string) => {
  switch (estado) {
    case 'PENDIENTE': return 'bg-yellow-50 text-yellow-600'
    case 'APROBADA': return 'bg-green-50 text-green-600'
    case 'RECHAZADA': return 'bg-red-50 text-red-600'
    case 'VENCIDA': return 'bg-slate-100 text-slate-500'
    default: return 'bg-slate-100 text-slate-500'
  }
}

const valorCotizacion = (c: Cotizacion, key: string): string | number => {
  switch (key) {
    case 'codigo': return c.codigo
    case 'cliente': return c.cliente?.nombre || 'Mostrador'
    case 'validez': return c.fechaValidez ? String(c.fechaValidez).slice(0, 10) : ''
    case 'subtotal': return Number(c.subtotal)
    case 'total': return Number(c.total)
    case 'estado': return c.estado
    case 'fecha': return new Date(c.createdAt).getTime()
    default: return ''
  }
}

export default function Cotizaciones() {
  const rol = authService.getUsuario()?.rol
  const puedeCambiarEstado = rol === 'Administrador' || rol === 'Cajero'
  const puedeEliminar = rol === 'Administrador'
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [clientes, setClientes] = useState<ClienteOption[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [codigo, setCodigo] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [fechaValidez, setFechaValidez] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [detalles, setDetalles] = useState<DetalleForm[]>([])
  const [busquedaProd, setBusquedaProd] = useState('')
  const [editEstado, setEditEstado] = useState('PENDIENTE')
  const [busqueda, setBusqueda] = useState('')

  const cotizacionesFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return cotizaciones
    return cotizaciones.filter(c =>
      c.codigo.toLowerCase().includes(q) ||
      (c.cliente?.nombre || '').toLowerCase().includes(q) ||
      String(c.estado || '').toLowerCase().includes(q),
    )
  }, [cotizaciones, busqueda])

  const tabla = useTabla(cotizacionesFiltradas, valorCotizacion)

  useEffect(() => {
    Promise.all([loadCotizaciones(), loadSelectData()])
  }, [])

  const loadCotizaciones = async () => {
    try {
      const data = await cotizacionesService.getAll()
      setCotizaciones(data)
    } catch {
      Swal.fire('Error', 'No se pudieron cargar las cotizaciones', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadSelectData = async () => {
    try {
      const [{ data: c }, { data: p }] = await Promise.all([
        api.get('/clientes'),
        api.get('/productos'),
      ])
      setClientes(c)
      setProductos(p)
    } catch {}
  }

  const openCreate = () => {
    setEditId(null)
    // Código correlativo sugerido (COT-0001, COT-0002, ...); se puede cambiar.
    const max = cotizaciones.reduce((m, c) => Math.max(m, Number(/^COT-(\d+)$/.exec(c.codigo || '')?.[1] || 0)), 0)
    setCodigo(`COT-${String(max + 1).padStart(4, '0')}`)
    setClienteId('')
    setFechaValidez('')
    setObservaciones('')
    setDetalles([])
    setBusquedaProd('')
    setModalOpen(true)
  }

  const openEdit = async (id: string) => {
    try {
      const c = await cotizacionesService.getById(id)
      setEditId(id)
      setEditEstado(c.estado)
      setEditModal(true)
    } catch {
      Swal.fire('Error', 'No se pudo cargar la cotización', 'error')
    }
  }

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar cotización?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    })
    if (result.isConfirmed) {
      try {
        await cotizacionesService.delete(id)
        Swal.fire('Eliminada', 'Cotización eliminada correctamente', 'success')
        loadCotizaciones()
      } catch {
        Swal.fire('Error', 'No se pudo eliminar', 'error')
      }
    }
  }

  const removeDetalleRow = (idx: number) => {
    setDetalles(detalles.filter((_, i) => i !== idx))
  }

  // Agrega un producto a la cotización; si ya está, incrementa su cantidad.
  const addProductoCot = (p: Producto) => {
    const existente = detalles.find(d => d.productoId === p.id)
    if (existente) {
      setDetalles(detalles.map(d => d.productoId === p.id ? { ...d, cantidad: d.cantidad + 1 } : d))
    } else {
      setDetalles([...detalles, { productoId: p.id, cantidad: 1, precioUnitario: Number(p.precioBase) }])
    }
  }

  // Ajusta la cantidad; si baja de 1, elimina la línea.
  const setCantidadCot = (idx: number, n: number) => {
    if (n < 1) { removeDetalleRow(idx); return }
    setDetalles(detalles.map((d, k) => k === idx ? { ...d, cantidad: n } : d))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!codigo) {
      Swal.fire('Validación', 'El código es requerido', 'warning')
      return
    }
    const validDetalles = detalles.filter(d => d.productoId && d.cantidad > 0)
    if (validDetalles.length === 0) {
      Swal.fire('Validación', 'Agrega al menos un producto', 'warning')
      return
    }
    setSaving(true)
    try {
      await cotizacionesService.create({
        codigo,
        clienteId: clienteId || undefined,
        fechaValidez: fechaValidez || undefined,
        observaciones: observaciones || undefined,
        detalles: validDetalles,
      })
      Swal.fire('Creada', 'Cotización creada correctamente', 'success')
      setModalOpen(false)
      loadCotizaciones()
    } catch (err: any) {
      Swal.fire('Error', err?.response?.data?.message || 'Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleEditEstado = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editId) return
    setSaving(true)
    try {
      await cotizacionesService.update(editId, { estado: editEstado as Cotizacion['estado'] })
      Swal.fire('Actualizada', 'Cotización actualizada correctamente', 'success')
      setEditModal(false)
      loadCotizaciones()
    } catch (err: any) {
      Swal.fire('Error', err?.response?.data?.message || 'Error al actualizar', 'error')
    } finally {
      setSaving(false)
    }
  }

  const subtotal = detalles.reduce((sum, d) => sum + d.cantidad * d.precioUnitario, 0)
  const impuesto = subtotal * 0.13
  const productosDisponibles = productos.filter(p => {
    if (!p.esActivo) return false
    const q = busquedaProd.trim().toLowerCase()
    return !q || p.nombre.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
  })

  return (
    <div className="animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Cotizaciones</h3>
            <p className="text-sm text-slate-400 mt-0.5">{tabla.total} cotización(es)</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nueva Cotización
          </button>
        </div>

        <div className="relative max-w-sm mb-4">
          <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por código, cliente o estado..."
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
                  <ThOrdenable label="Código" col="codigo" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Cliente" col="cliente" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Validez" col="validez" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Subtotal" col="subtotal" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Total" col="total" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Estado" col="estado" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Fecha" col="fecha" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tabla.visibles.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors duration-150 group">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-800">{c.codigo}</td>
                    <td className="py-3.5 px-4 text-slate-600">{c.cliente ? `${c.cliente.nombre} ${c.cliente.apellido || ''}`.trim() : 'Mostrador'}</td>
                    <td className="py-3.5 px-4 text-slate-600">{formatoFechaSolo(c.fechaValidez as any)}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">Bs. {Number(c.subtotal).toFixed(2)}</td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">Bs. {Number(c.total).toFixed(2)}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${estadoBadge(c.estado)}`}>{c.estado}</span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">{new Date(c.createdAt).toLocaleDateString('es-BO')}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-all duration-200 lg:translate-x-2 lg:group-hover:translate-x-0 lg:group-focus-within:translate-x-0">
                        {puedeCambiarEstado && <button onClick={() => openEdit(c.id)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Cambiar estado">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>}
                        {puedeEliminar && <button onClick={() => handleDelete(c.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tabla.total === 0 && (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-slate-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-slate-400 font-medium">{cotizaciones.length === 0 ? 'No hay cotizaciones registradas' : 'Sin resultados para la búsqueda'}</p>
                {cotizaciones.length === 0 && <button onClick={openCreate} className="mt-3 text-blue-600 text-sm font-medium hover:text-blue-700">Crear la primera cotización</button>}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva Cotización" size="xl">
        <form onSubmit={handleSave}>
          <div className="grid lg:grid-cols-5 gap-5">
            {/* Catálogo: tocar para agregar */}
            <div className="lg:col-span-3 flex flex-col">
              <div className="relative mb-3">
                <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" value={busquedaProd} onChange={e => setBusquedaProd(e.target.value)}
                  placeholder="Buscar producto por nombre o SKU…"
                  className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 overflow-y-auto max-h-[54vh] pr-1 content-start">
                {productosDisponibles.map(p => {
                  const enCot = detalles.find(d => d.productoId === p.id)
                  return (
                    <button key={p.id} type="button" onClick={() => addProductoCot(p)}
                      className="relative text-left p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-md transition-all active:scale-[0.98]">
                      <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 min-h-[2.5rem]">{p.nombre}</p>
                      <p className="text-base font-bold text-blue-600 mt-1 font-mono">Bs. {Number(p.precioBase).toFixed(2)}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Stock: {p.stockActual}</p>
                      {enCot && (
                        <span className="absolute top-2 right-2 min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full bg-blue-600 text-white text-[11px] font-bold">{enCot.cantidad}</span>
                      )}
                    </button>
                  )
                })}
                {productosDisponibles.length === 0 && (
                  <div className="col-span-full py-12 text-center text-sm text-slate-400">No se encontraron productos.</div>
                )}
              </div>
            </div>

            {/* Datos, carrito y totales */}
            <div className="lg:col-span-2">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">Código *</label>
                    <input value={codigo} onChange={e => setCodigo(e.target.value)} required placeholder="COT-001"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">Fecha de validez</label>
                    <input type="date" value={fechaValidez} onChange={e => setFechaValidez(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                  </div>
                </div>
                <div className="mt-2">
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Cliente</label>
                  <select value={clienteId} onChange={e => setClienteId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none">
                    <option value="">Mostrador</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido ?? ''}</option>)}
                  </select>
                </div>
                <div className="mt-2">
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Observaciones</label>
                  <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} placeholder="Opcional"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none" />
                </div>

                {/* Carrito */}
                <div className="mt-3 pt-3 border-t border-slate-200 overflow-y-auto min-h-[100px] max-h-[24vh]">
                  {detalles.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center py-6 text-sm text-slate-400">Toca un producto para agregarlo a la cotización.</div>
                  ) : (
                    <div className="space-y-1">
                      {detalles.map((det, idx) => {
                        const nombre = productos.find(p => p.id === det.productoId)?.nombre || ''
                        return (
                          <div key={det.productoId} className="flex items-center gap-2 py-1.5">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate">{nombre}</p>
                              <p className="text-[11px] text-slate-400 font-mono">Bs. {Number(det.precioUnitario).toFixed(2)} c/u</p>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <button type="button" onClick={() => setCantidadCot(idx, det.cantidad - 1)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-base leading-none">−</button>
                              <span className="w-7 text-center text-sm font-semibold text-slate-800">{det.cantidad}</span>
                              <button type="button" onClick={() => setCantidadCot(idx, det.cantidad + 1)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-base leading-none">+</button>
                            </div>
                            <span className="w-20 text-right text-sm font-semibold text-slate-800 font-mono">Bs. {(det.cantidad * det.precioUnitario).toFixed(2)}</span>
                            <button type="button" onClick={() => removeDetalleRow(idx)} title="Quitar" className="p-1 text-slate-300 hover:text-red-500 transition-colors">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Totales */}
                <div className="border-t border-slate-200 pt-3 mt-1 space-y-1.5">
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="text-slate-700 font-mono">Bs. {subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Impuesto (13%)</span><span className="text-slate-700 font-mono">Bs. {impuesto.toFixed(2)}</span></div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200"><span className="text-base font-semibold text-slate-800">Total</span><span className="text-2xl font-bold text-slate-900 font-mono">Bs. {(subtotal + impuesto).toFixed(2)}</span></div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                  <button type="submit" disabled={saving || detalles.length === 0} className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
                    {saving && (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    )}
                    Crear Cotización
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      <Modal open={editModal} onClose={() => setEditModal(false)} title="Cambiar Estado de Cotización">
        <form onSubmit={handleEditEstado} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
            <select value={editEstado} onChange={e => setEditEstado(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
              <option value="PENDIENTE">Pendiente</option>
              <option value="APROBADA">Aprobada</option>
              <option value="RECHAZADA">Rechazada</option>
              <option value="VENCIDA">Vencida</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditModal(false)} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2">
              {saving && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              Actualizar Estado
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
