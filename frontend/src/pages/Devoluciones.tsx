import { useEffect, useMemo, useState } from 'react'
import { devolucionesService } from '../services/devoluciones.service'
import { Devolucion, DetalleDevolucion, Venta } from '../types'
import Swal from 'sweetalert2'
import Modal from '../components/Modal'
import api from '../services/api'
import { useTabla } from '../hooks/useTabla'
import Paginador from '../components/Paginador'
import ThOrdenable from '../components/ThOrdenable'

interface LineaDev {
  productoId: string
  productoNombre: string
  precioUnitario: number
  maxCantidad: number
  cantidad: number
}

const valorDev = (d: Devolucion, key: string): string | number => {
  switch (key) {
    case 'codigo': return d.codigo
    case 'venta': return d.venta?.codigoComprobante || ''
    case 'motivo': return d.motivo || ''
    case 'subtotal': return Number(d.subtotal)
    case 'impuesto': return Number(d.impuesto)
    case 'total': return Number(d.total)
    case 'estado': return d.estado
    case 'fecha': return new Date(d.createdAt).getTime()
    default: return ''
  }
}

export default function Devoluciones() {
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [detalleModal, setDetalleModal] = useState(false)
  const [selectedDev, setSelectedDev] = useState<Devolucion | null>(null)
  const [saving, setSaving] = useState(false)

  const [ventas, setVentas] = useState<Venta[]>([])
  const [codigo, setCodigo] = useState('')
  const [ventaId, setVentaId] = useState('')
  const [motivo, setMotivo] = useState('')
  const [lineas, setLineas] = useState<LineaDev[]>([])
  const [busqueda, setBusqueda] = useState('')

  const devFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return devoluciones
    return devoluciones.filter(d =>
      d.codigo.toLowerCase().includes(q) ||
      (d.motivo || '').toLowerCase().includes(q) ||
      (d.venta?.codigoComprobante || '').toLowerCase().includes(q) ||
      String(d.estado || '').toLowerCase().includes(q),
    )
  }, [devoluciones, busqueda])

  const tabla = useTabla(devFiltradas, valorDev)

  useEffect(() => {
    Promise.all([loadDevoluciones(), loadSelectData()])
  }, [])

  const loadDevoluciones = async () => {
    try {
      const data = await devolucionesService.getAll()
      setDevoluciones(data)
    } catch {
      Swal.fire('Error', 'No se pudieron cargar las devoluciones', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadSelectData = async () => {
    try {
      const { data: v } = await api.get('/ventas')
      // Solo se puede devolver sobre ventas completadas.
      setVentas((v as Venta[]).filter(x => x.estado === 'COMPLETADA'))
    } catch {}
  }

  const openCreate = () => {
    loadSelectData()
    setCodigo(`DEV-${String(Date.now()).slice(-6)}`)
    setVentaId('')
    setMotivo('')
    setLineas([])
    setModalOpen(true)
  }

  // Al elegir la venta, se cargan sus productos con lo que aún se puede devolver
  // (vendido menos devoluciones previas) y el precio efectivamente cobrado.
  const onSelectVenta = (vid: string) => {
    setVentaId(vid)
    const venta = ventas.find(v => v.id === vid)
    if (!venta || !venta.detalles) { setLineas([]); return }
    const devuelto: Record<string, number> = {}
    devoluciones.filter(d => d.ventaId === vid || d.venta?.id === vid).forEach(d =>
      d.detalles?.forEach(dd => { const pid = dd.productoId || dd.producto?.id || ''; devuelto[pid] = (devuelto[pid] || 0) + dd.cantidad }))
    const sub = Number(venta.subtotal)
    const factorNeto = sub > 0 ? (sub - Number(venta.descuento)) / sub : 1
    setLineas(venta.detalles.map(d => {
      const pid = d.productoId || d.producto?.id || ''
      return {
        productoId: pid,
        productoNombre: d.producto?.nombre || '',
        precioUnitario: Math.round((Number(d.subtotal) / d.cantidad) * factorNeto * 100) / 100,
        maxCantidad: Math.max(0, d.cantidad - (devuelto[pid] || 0)),
        cantidad: 0,
      }
    }))
  }

  const setCantidadDev = (idx: number, n: number) => {
    setLineas(lineas.map((l, k) => k === idx ? { ...l, cantidad: Math.max(0, Math.min(l.maxCantidad, n)) } : l))
  }

  const viewDetail = async (dev: Devolucion) => {
    try {
      const full = await devolucionesService.getById(dev.id)
      setSelectedDev(full)
      setDetalleModal(true)
    } catch {
      Swal.fire('Error', 'No se pudo cargar el detalle', 'error')
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ventaId || !codigo || !motivo) {
      Swal.fire('Validación', 'Completa la venta, el código y el motivo', 'warning')
      return
    }
    const validDetalles = lineas
      .filter(l => l.cantidad > 0)
      .map(l => ({ productoId: l.productoId, cantidad: l.cantidad, precioUnitario: l.precioUnitario }))
    if (validDetalles.length === 0) {
      Swal.fire('Validación', 'Indica la cantidad a devolver de al menos un producto', 'warning')
      return
    }
    setSaving(true)
    try {
      await devolucionesService.create({
        ventaId,
        codigo,
        motivo,
        detalles: validDetalles,
      })
      Swal.fire('Creada', 'Devolución creada correctamente', 'success')
      setModalOpen(false)
      loadDevoluciones()
    } catch (err: any) {
      const msg = err?.response?.data?.message
      Swal.fire('Error', Array.isArray(msg) ? msg.join(', ') : msg || 'Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Vista previa con la misma regla del servidor: impuesto proporcional al de la venta original.
  const ventaSel = ventas.find(v => v.id === ventaId)
  const baseVenta = ventaSel ? Number(ventaSel.subtotal) - Number(ventaSel.descuento) : 0
  const tasaImpuesto = ventaSel && baseVenta > 0 ? Number(ventaSel.impuesto) / baseVenta : 0
  const subtotal = lineas.reduce((sum, l) => sum + l.cantidad * l.precioUnitario, 0)
  const impuesto = Math.round(subtotal * tasaImpuesto * 100) / 100
  const total = subtotal + impuesto

  return (
    <div className="animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Devoluciones</h3>
            <p className="text-sm text-slate-400 mt-0.5">{tabla.total} devolución(es)</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nueva Devolución
          </button>
        </div>

        <div className="relative max-w-sm mb-4">
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por código, venta o motivo…"
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
          />
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
                  <ThOrdenable label="Venta" col="venta" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Motivo" col="motivo" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Subtotal" col="subtotal" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Impuesto" col="impuesto" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Total" col="total" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Estado" col="estado" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Fecha" col="fecha" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tabla.visibles.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors duration-150 group">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-800">{d.codigo}</td>
                    <td className="py-3.5 px-4 text-slate-600">{d.venta?.codigoComprobante || '-'}</td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-[200px] truncate">{d.motivo}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">Bs. {Number(d.subtotal).toFixed(2)}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">Bs. {Number(d.impuesto).toFixed(2)}</td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">Bs. {Number(d.total).toFixed(2)}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        d.estado === 'COMPLETADA' ? 'bg-green-50 text-green-600' :
                        d.estado === 'PENDIENTE' ? 'bg-yellow-50 text-yellow-600' : 'bg-slate-100 text-slate-500'
                      }`}>{d.estado}</span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">{new Date(d.createdAt).toLocaleDateString('es-BO')}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-all duration-200 lg:translate-x-2 lg:group-hover:translate-x-0 lg:group-focus-within:translate-x-0">
                        <button onClick={() => viewDetail(d)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Ver detalle">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tabla.total === 0 && (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-slate-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
                </svg>
                <p className="text-slate-400 font-medium">{devoluciones.length === 0 ? 'No hay devoluciones registradas' : 'Sin resultados para la búsqueda'}</p>
                {devoluciones.length === 0 && (
                  <button onClick={openCreate} className="mt-3 text-blue-600 text-sm font-medium hover:text-blue-700">Crear la primera devolución</button>
                )}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva Devolución" size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Venta original *</label>
              <select value={ventaId} onChange={e => onSelectVenta(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white" required>
                <option value="">Seleccionar venta…</option>
                {ventas.map(v => <option key={v.id} value={v.id}>{v.codigoComprobante}{v.cliente ? ` — ${v.cliente.nombre} ${v.cliente.apellido}` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Código de devolución *</label>
              <input value={codigo} onChange={e => setCodigo(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="DEV-001" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Motivo *</label>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" placeholder="Describe el motivo de la devolución" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Productos a devolver</label>
            {!ventaId ? (
              <div className="py-8 text-center text-sm text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">Selecciona una venta para ver sus productos.</div>
            ) : lineas.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400 bg-slate-50 rounded-xl">La venta no tiene productos.</div>
            ) : (
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                {lineas.map((l, idx) => (
                  <div key={l.productoId} className="flex items-center gap-3 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{l.productoNombre}</p>
                      <p className="text-[11px] text-slate-400 font-mono">Bs. {l.precioUnitario.toFixed(2)} c/u · por devolver: {l.maxCantidad}</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button type="button" onClick={() => setCantidadDev(idx, l.cantidad - 1)} disabled={l.cantidad <= 0}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 text-slate-600 text-base leading-none">−</button>
                      <span className="w-9 text-center text-sm font-semibold text-slate-800">{l.cantidad}</span>
                      <button type="button" onClick={() => setCantidadDev(idx, l.cantidad + 1)} disabled={l.cantidad >= l.maxCantidad}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 text-slate-600 text-base leading-none">+</button>
                    </div>
                    <span className="w-24 text-right text-sm font-semibold text-slate-800 font-mono">Bs. {(l.cantidad * l.precioUnitario).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-50 rounded-xl p-4 space-y-1 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-mono">Bs. {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Impuesto ({Number((tasaImpuesto * 100).toFixed(2))}%)</span>
              <span className="font-mono">Bs. {impuesto.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-800 font-bold text-base pt-1 border-t border-slate-200">
              <span>Total</span>
              <span className="font-mono">Bs. {total.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2">
              {saving && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              Crear Devolución
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={detalleModal} onClose={() => setDetalleModal(false)} title="Detalle de Devolución">
        {selectedDev && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-400">Código:</span> <span className="font-medium text-slate-700">{selectedDev.codigo}</span></div>
              <div><span className="text-slate-400">Venta:</span> <span className="font-medium text-slate-700">{selectedDev.venta?.codigoComprobante || '-'}</span></div>
              <div><span className="text-slate-400">Estado:</span> <span className="font-medium text-slate-700">{selectedDev.estado}</span></div>
              <div><span className="text-slate-400">Fecha:</span> <span className="font-medium text-slate-700">{new Date(selectedDev.createdAt).toLocaleString('es-BO')}</span></div>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">Motivo:</p>
              <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3">{selectedDev.motivo}</p>
            </div>
            {selectedDev.detalles && selectedDev.detalles.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Productos devueltos</p>
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 bg-slate-50/80">
                        <th className="py-2 px-3 font-semibold text-xs uppercase tracking-wider">Producto</th>
                        <th className="py-2 px-3 font-semibold text-xs uppercase tracking-wider">Cantidad</th>
                        <th className="py-2 px-3 font-semibold text-xs uppercase tracking-wider">Precio</th>
                        <th className="py-2 px-3 font-semibold text-xs uppercase tracking-wider">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {selectedDev.detalles.map((det: DetalleDevolucion) => (
                        <tr key={det.id}>
                          <td className="py-2 px-3 text-slate-700">{det.producto?.nombre || det.productoId}</td>
                          <td className="py-2 px-3">{det.cantidad}</td>
                          <td className="py-2 px-3 font-mono">Bs. {Number(det.precioUnitario).toFixed(2)}</td>
                          <td className="py-2 px-3 font-mono">Bs. {Number(det.subtotal).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="bg-slate-50 rounded-xl p-4 space-y-1 text-sm">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="font-mono">Bs. {Number(selectedDev.subtotal).toFixed(2)}</span></div>
              <div className="flex justify-between text-slate-600"><span>Impuesto</span><span className="font-mono">Bs. {Number(selectedDev.impuesto).toFixed(2)}</span></div>
              <div className="flex justify-between text-slate-800 font-bold text-base pt-1 border-t border-slate-200"><span>Total</span><span className="font-mono">Bs. {Number(selectedDev.total).toFixed(2)}</span></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
