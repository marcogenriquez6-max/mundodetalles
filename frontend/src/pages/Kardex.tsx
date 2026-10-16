import { useEffect, useMemo, useState } from 'react'
import { kardexService } from '../services/kardex.service'
import { KardexMovimiento, Producto } from '../types'
import { productosService } from '../services/productos.service'
import { authService } from '../services/auth.service'
import api from '../services/api'
import Modal from '../components/Modal'
import Swal from 'sweetalert2'
import { fechaLocal } from '../utils/fechas'
import { useTabla } from '../hooks/useTabla'
import Paginador from '../components/Paginador'
import ThOrdenable from '../components/ThOrdenable'

const tipoOptions = ['', 'ENTRADA', 'SALIDA', 'AJUSTE'] as const

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))

const valorKardex = (m: KardexMovimiento, key: string): string | number => {
  switch (key) {
    case 'producto': return m.producto?.nombre || m.productoId
    case 'tipo': return m.tipoMovimiento
    case 'cantidad': return m.cantidad
    case 'stock': return m.stockNuevo
    case 'referencia': return m.referencia || ''
    case 'observacion': return m.observacion || ''
    case 'fecha': return new Date(m.createdAt).getTime()
    default: return ''
  }
}

export default function Kardex() {
  const esAdmin = authService.getUsuario()?.rol === 'Administrador'
  const [movOpen, setMovOpen] = useState(false)
  const [movTipo, setMovTipo] = useState<'ENTRADA' | 'SALIDA' | 'AJUSTE'>('SALIDA')
  const [movProducto, setMovProducto] = useState('')
  const [movCantidad, setMovCantidad] = useState('1')
  const [movCosto, setMovCosto] = useState('')
  const [movObs, setMovObs] = useState('')
  const [movSaving, setMovSaving] = useState(false)
  const [movimientos, setMovimientos] = useState<KardexMovimiento[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroProducto, setFiltroProducto] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const movimientosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return movimientos
    return movimientos.filter(m =>
      (m.producto?.nombre || m.productoId || '').toLowerCase().includes(q) ||
      (m.referencia || '').toLowerCase().includes(q) ||
      (m.observacion || '').toLowerCase().includes(q) ||
      String(m.tipoMovimiento || '').toLowerCase().includes(q),
    )
  }, [movimientos, busqueda])

  const tabla = useTabla(movimientosFiltrados, valorKardex)

  useEffect(() => {
    Promise.all([loadMovimientos(), loadProductos()])
  }, [])

  const loadProductos = async () => {
    try {
      const data = await productosService.getAll()
      setProductos(data)
    } catch {}
  }

  const loadMovimientos = async () => {
    setLoading(true)
    try {
      const data = await kardexService.getAll({
        productoId: filtroProducto || undefined,
        tipoMovimiento: filtroTipo || undefined,
        fechaInicio: fechaInicio || undefined,
        fechaFin: fechaFin || undefined,
      })
      setMovimientos(data)
    } catch {
      setMovimientos([])
    } finally {
      setLoading(false)
    }
  }

  const abrirMovimiento = () => {
    setMovTipo('SALIDA'); setMovProducto(''); setMovCantidad('1'); setMovCosto(''); setMovObs(''); setMovOpen(true)
  }

  const prodSel = productos.find(p => p.id === movProducto)

  const guardarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!movProducto) { Swal.fire('Validación', 'Seleccione un producto', 'warning'); return }
    const n = parseInt(movCantidad, 10)
    if (!Number.isInteger(n) || n < (movTipo === 'AJUSTE' ? 0 : 1)) {
      Swal.fire('Validación', movTipo === 'AJUSTE' ? 'Indique el stock contado (0 o más)' : 'Indique una cantidad mayor a 0', 'warning')
      return
    }
    setMovSaving(true)
    try {
      await api.post('/kardex', {
        productoId: movProducto,
        tipoMovimiento: movTipo,
        ...(movTipo === 'AJUSTE' ? { stockNuevo: n } : { cantidad: n }),
        costoUnitario: movTipo === 'ENTRADA' && movCosto ? Number(movCosto) : undefined,
        referencia: movTipo === 'ENTRADA' ? 'COMPRA' : movTipo === 'SALIDA' ? 'MERMA' : 'CONTEO_FISICO',
        observacion: movObs.trim() || undefined,
      })
      Swal.fire('Movimiento registrado', 'El stock del producto se actualizó y quedó registrado en el Kardex.', 'success')
      setMovOpen(false)
      loadMovimientos()
      loadProductos()
    } catch (err: any) {
      const msg = err?.response?.data?.message
      Swal.fire('Error', Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo registrar el movimiento', 'error')
    } finally {
      setMovSaving(false)
    }
  }

  const exportar = () => {
    const rows = [['Producto', 'Tipo', 'Cantidad', 'Stock Anterior', 'Stock Nuevo', 'Referencia', 'Observación', 'Fecha']]
    movimientosFiltrados.forEach((m) =>
      rows.push([
        m.producto?.nombre || m.productoId,
        m.tipoMovimiento,
        String(m.cantidad),
        String(m.stockAnterior),
        String(m.stockNuevo),
        m.referencia || '',
        m.observacion || '',
        new Date(m.createdAt).toLocaleString('es-BO'),
      ]),
    )
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `kardex-${fechaLocal(new Date())}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const imprimir = () => {
    const filas = movimientosFiltrados
      .map(
        (m) =>
          `<tr><td>${esc(m.producto?.nombre || m.productoId)}</td><td>${esc(m.tipoMovimiento)}</td><td class="num">${esc(m.cantidad)}</td><td class="num">${esc(m.stockAnterior)} &rarr; ${esc(m.stockNuevo)}</td><td>${esc(m.referencia || '-')}</td><td>${esc(m.observacion || '-')}</td><td>${esc(new Date(m.createdAt).toLocaleString('es-BO'))}</td></tr>`,
      )
      .join('')
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Kardex - Mundo Detalles</title>
      <style>
        *{font-family:system-ui,Segoe UI,Arial,sans-serif} body{padding:24px;color:#1e293b}
        h1{font-size:18px;margin:0 0 4px} p.meta{color:#64748b;font-size:12px;margin:0 0 16px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left}
        th{background:#f1f5f9;text-transform:uppercase;font-size:10px;letter-spacing:.04em}
        td.num{text-align:right}
        @media print{@page{margin:12mm}}
      </style></head><body>
      <h1>Kardex de movimientos</h1>
      <p class="meta">Mundo Detalles &middot; Generado el ${esc(new Date().toLocaleString('es-BO'))} &middot; ${movimientosFiltrados.length} movimiento(s)</p>
      <table><thead><tr><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Stock ant. &rarr; nuevo</th><th>Referencia</th><th>Observación</th><th>Fecha</th></tr></thead><tbody>${filas}</tbody></table>
      </body></html>`)
    win.document.close()
    win.focus()
    win.print()
  }

  const totalEntradas = movimientosFiltrados
    .filter(m => m.tipoMovimiento === 'ENTRADA')
    .reduce((sum, m) => sum + m.cantidad, 0)

  const totalSalidas = movimientosFiltrados
    .filter(m => m.tipoMovimiento === 'SALIDA')
    .reduce((sum, m) => sum + m.cantidad, 0)

  const tipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'ENTRADA': return 'bg-green-50 text-green-600'
      case 'SALIDA': return 'bg-red-50 text-red-600'
      case 'AJUSTE': return 'bg-blue-50 text-blue-600'
      default: return 'bg-slate-100 text-slate-500'
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{movimientosFiltrados.length}</p>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Total Movimientos</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">+{totalEntradas}</p>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Entradas</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">-{totalSalidas}</p>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Salidas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Kardex</h3>
            <p className="text-sm text-slate-400 mt-0.5">{movimientosFiltrados.length} movimiento(s)</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={exportar} disabled={movimientosFiltrados.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium text-sm rounded-xl hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-40 transition-all shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Exportar CSV
            </button>
            <button onClick={imprimir} disabled={movimientosFiltrados.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-medium text-sm rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Imprimir
            </button>
            {esAdmin && (
              <button onClick={abrirMovimiento}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium text-sm rounded-xl hover:from-blue-600 hover:to-blue-700 shadow-sm shadow-blue-200 transition-all active:scale-95">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Registrar movimiento
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Buscar</label>
            <div className="relative">
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
              </svg>
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Producto, referencia u observación…"
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Producto</label>
            <select value={filtroProducto} onChange={e => setFiltroProducto(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white">
              <option value="">Todos los productos</option>
              {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Tipo</label>
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white">
              <option value="">Todos</option>
              {tipoOptions.filter(t => t).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Fecha Inicio</label>
            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Fecha Fin</label>
            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <button onClick={loadMovimientos}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Filtrar
          </button>
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
                  <ThOrdenable label="Producto" col="producto" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Tipo" col="tipo" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Cantidad" col="cantidad" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Stock Anterior → Nuevo" col="stock" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Referencia" col="referencia" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Observación" col="observacion" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Fecha" col="fecha" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tabla.visibles.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors duration-150">
                    <td className="py-3.5 px-4 font-medium text-slate-800">{m.producto?.nombre || m.productoId}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${tipoBadge(m.tipoMovimiento)}`}>
                        {m.tipoMovimiento}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">{m.cantidad}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-slate-600">{m.stockAnterior}</span>
                      <span className="mx-1.5 text-slate-300">→</span>
                      <span className="font-mono font-semibold text-slate-800">{m.stockNuevo}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{m.referencia || '-'}</td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-[200px] truncate">{m.observacion || '-'}</td>
                    <td className="py-3.5 px-4 text-slate-500 text-xs">{new Date(m.createdAt).toLocaleString('es-BO')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tabla.total === 0 && (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-slate-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <p className="text-slate-400 font-medium">{movimientos.length === 0 ? 'No hay movimientos registrados' : 'Sin resultados para la búsqueda'}</p>
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
      <Modal open={movOpen} onClose={() => setMovOpen(false)} title="Registrar movimiento de inventario">
        <form onSubmit={guardarMovimiento} className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {(['ENTRADA', 'SALIDA', 'AJUSTE'] as const).map(t => (
              <button type="button" key={t} onClick={() => setMovTipo(t)}
                className={`py-2 rounded-xl text-sm font-medium border transition-colors ${movTipo === t ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {t === 'ENTRADA' ? 'Entrada (compra)' : t === 'SALIDA' ? 'Salida (merma)' : 'Ajuste (conteo)'}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Producto *</label>
            <select value={movProducto} onChange={e => setMovProducto(e.target.value)} required
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar producto…</option>
              {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} (stock {p.stockActual})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{movTipo === 'AJUSTE' ? 'Stock contado *' : 'Cantidad *'}</label>
              <input type="number" min={movTipo === 'AJUSTE' ? 0 : 1} step="1" value={movCantidad} onChange={e => setMovCantidad(e.target.value)} required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {movTipo === 'ENTRADA' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Costo unitario (Bs.)</label>
                <input type="number" min="0" step="0.01" value={movCosto} onChange={e => setMovCosto(e.target.value)} placeholder="Opcional"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
          </div>
          {prodSel && (
            <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2">
              Stock actual: <b>{prodSel.stockActual}</b> →{' '}
              <b>{movTipo === 'ENTRADA' ? prodSel.stockActual + (parseInt(movCantidad, 10) || 0) : movTipo === 'SALIDA' ? prodSel.stockActual - (parseInt(movCantidad, 10) || 0) : (parseInt(movCantidad, 10) || 0)}</b>
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Observación</label>
            <input value={movObs} onChange={e => setMovObs(e.target.value)} maxLength={500} placeholder={movTipo === 'SALIDA' ? 'Ej.: producto dañado' : movTipo === 'AJUSTE' ? 'Ej.: inventario físico mensual' : 'Ej.: factura del proveedor'}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setMovOpen(false)} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
            <button type="submit" disabled={movSaving} className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all">
              {movSaving ? 'Guardando…' : 'Registrar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
