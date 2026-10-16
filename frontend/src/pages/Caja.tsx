import { useEffect, useMemo, useState } from 'react'
import { cajaService } from '../services/caja.service'
import type { Caja as CajaType } from '../types'
import Swal from 'sweetalert2'
import Modal from '../components/Modal'
import { useTabla } from '../hooks/useTabla'
import Paginador from '../components/Paginador'
import ThOrdenable from '../components/ThOrdenable'

const valorCaja = (c: CajaType, key: string): string | number => {
  switch (key) {
    case 'apertura': return new Date(c.fechaApertura).getTime()
    case 'cierre': return c.fechaCierre ? new Date(c.fechaCierre).getTime() : 0
    case 'montoInicial': return Number(c.montoInicial)
    case 'montoFinal': return c.montoFinal != null ? Number(c.montoFinal) : -1
    case 'ingresos': return Number(c.totalIngresos)
    case 'egresos': return Number(c.totalEgresos)
    case 'diferencia': return c.diferencia != null ? Number(c.diferencia) : 0
    case 'estado': return c.estado
    default: return ''
  }
}

export default function Caja() {
  const [cajas, setCajas] = useState<CajaType[]>([])
  const [cajaAbierta, setCajaAbierta] = useState<CajaType | null>(null)
  const [loading, setLoading] = useState(true)
  const [abrirModal, setAbrirModal] = useState(false)
  const [cerrarModal, setCerrarModal] = useState(false)
  const [montoInicial, setMontoInicial] = useState(0)
  const [montoFinal, setMontoFinal] = useState(0)
  const [observaciones, setObservaciones] = useState('')
  const [saving, setSaving] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  const cajasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return cajas.filter(c => {
      if (filtroEstado && c.estado !== filtroEstado) return false
      if (!q) return true
      const fecha = new Date(c.fechaApertura).toLocaleString('es-BO').toLowerCase()
      return fecha.includes(q) || String(c.estado || '').toLowerCase().includes(q)
    })
  }, [cajas, busqueda, filtroEstado])

  const tabla = useTabla(cajasFiltradas, valorCaja)

  useEffect(() => {
    Promise.all([loadCajas(), loadAbierta()])
  }, [])

  const loadCajas = async () => {
    try {
      const data = await cajaService.getAll()
      setCajas(data)
    } catch {
      Swal.fire('Error', 'No se pudieron cargar las cajas', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadAbierta = async () => {
    try {
      const data = await cajaService.findAbierta()
      setCajaAbierta(data)
    } catch {}
  }

  const handleAbrir = async (e: React.FormEvent) => {
    e.preventDefault()
    if (montoInicial < 0) {
      Swal.fire('Validación', 'El monto inicial no puede ser negativo', 'warning')
      return
    }
    setSaving(true)
    try {
      await cajaService.abrir(montoInicial, observaciones || undefined)
      Swal.fire('Caja abierta', 'La caja se ha abierto correctamente', 'success')
      setAbrirModal(false)
      setMontoInicial(0)
      setObservaciones('')
      await Promise.all([loadCajas(), loadAbierta()])
    } catch (err: any) {
      Swal.fire('Error', err?.response?.data?.message || 'Error al abrir caja', 'error')
    } finally {
      setSaving(false)
    }
  }

  const openCerrar = async () => {
    // Recalcular con las últimas ventas antes de cerrar.
    const actual = await cajaService.findAbierta().catch(() => cajaAbierta)
    if (actual) setCajaAbierta(actual)
    const base = actual ?? cajaAbierta
    setMontoFinal(Number(base?.saldoEsperado ?? base?.montoInicial ?? 0))
    setObservaciones('')
    setCerrarModal(true)
  }

  const handleCerrar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cajaAbierta) return
    setSaving(true)
    try {
      const cerrada = await cajaService.cerrar(cajaAbierta.id, montoFinal, observaciones || undefined)
      const dif = Number(cerrada.diferencia ?? 0)
      Swal.fire(
        'Caja cerrada',
        dif === 0
          ? 'El arqueo cuadra con el saldo esperado.'
          : `Diferencia de arqueo: ${dif > 0 ? 'sobrante' : 'faltante'} de Bs. ${Math.abs(dif).toFixed(2)}.`,
        dif === 0 ? 'success' : 'warning',
      )
      setCerrarModal(false)
      await Promise.all([loadCajas(), loadAbierta()])
    } catch (err: any) {
      Swal.fire('Error', err?.response?.data?.message || 'Error al cerrar caja', 'error')
    } finally {
      setSaving(false)
    }
  }

  const ingresos = cajaAbierta ? Number(cajaAbierta.totalIngresos) : 0
  const egresos = cajaAbierta ? Number(cajaAbierta.totalEgresos) : 0
  const saldo = cajaAbierta ? Number(cajaAbierta.saldoEsperado ?? Number(cajaAbierta.montoInicial) + ingresos - egresos) : 0
  const otrosMedios = cajaAbierta ? Number(cajaAbierta.ventasOtrosMedios ?? 0) : 0

  return (
    <div className="animate-fade-in space-y-6">
      {cajaAbierta ? (
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold">Caja Abierta</h3>
                <p className="text-sm text-emerald-100">Desde {new Date(cajaAbierta.fechaApertura).toLocaleString('es-BO')}</p>
              </div>
            </div>
            <button onClick={openCerrar} className="px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl font-medium transition-all text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
              Cerrar Caja
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wider text-emerald-100 mb-1">Monto Inicial</p>
              <p className="text-xl font-bold">Bs. {Number(cajaAbierta.montoInicial).toFixed(2)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wider text-emerald-100 mb-1">Ingresos (efectivo)</p>
              <p className="text-xl font-bold">Bs. {ingresos.toFixed(2)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wider text-emerald-100 mb-1">Egresos (devoluciones)</p>
              <p className="text-xl font-bold">Bs. {egresos.toFixed(2)}</p>
            </div>
          </div>
          <div className="mt-4 bg-white/10 rounded-xl p-4 backdrop-blur-sm flex justify-between items-center">
            <span className="text-sm uppercase tracking-wider">Saldo esperado en caja</span>
            <span className="text-2xl font-bold">Bs. {saldo.toFixed(2)}</span>
          </div>
          <p className="mt-3 text-xs text-emerald-100">
            {cajaAbierta.cantidadVentas ?? 0} venta(s) en el turno · cobros por QR, tarjeta o transferencia: Bs. {otrosMedios.toFixed(2)} (no ingresan al cajón)
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">No hay caja abierta</h3>
            <p className="text-sm text-slate-400 mb-6">Abre una caja para comenzar a registrar operaciones</p>
            <button onClick={() => { setMontoInicial(0); setObservaciones(''); setAbrirModal(true) }}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-sm text-sm flex items-center gap-2 mx-auto">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Abrir Caja
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Historial de Cajas</h3>
            <p className="text-sm text-slate-400 mt-0.5">{tabla.total} registro(s)</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por fecha…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            />
          </div>
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
          >
            <option value="">Todos los estados</option>
            <option value="ABIERTA">Abierta</option>
            <option value="CERRADA">Cerrada</option>
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
                  <ThOrdenable label="Apertura" col="apertura" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Cierre" col="cierre" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Monto Inicial" col="montoInicial" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Monto Final" col="montoFinal" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Ingresos" col="ingresos" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Egresos" col="egresos" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Diferencia" col="diferencia" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Estado" col="estado" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tabla.visibles.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors duration-150">
                    <td className="py-3.5 px-4 text-slate-700">{new Date(c.fechaApertura).toLocaleString('es-BO')}</td>
                    <td className="py-3.5 px-4 text-slate-600">{c.fechaCierre ? new Date(c.fechaCierre).toLocaleString('es-BO') : '-'}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">Bs. {Number(c.montoInicial).toFixed(2)}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">{c.montoFinal != null ? `Bs. ${Number(c.montoFinal).toFixed(2)}` : '-'}</td>
                    <td className="py-3.5 px-4 font-mono text-green-600">Bs. {Number(c.totalIngresos).toFixed(2)}</td>
                    <td className="py-3.5 px-4 font-mono text-red-600">Bs. {Number(c.totalEgresos).toFixed(2)}</td>
                    <td className={`py-3.5 px-4 font-mono ${c.diferencia == null ? 'text-slate-400' : Number(c.diferencia) === 0 ? 'text-slate-600' : Number(c.diferencia) > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {c.diferencia == null ? '-' : `${Number(c.diferencia) > 0 ? '+' : ''}Bs. ${Number(c.diferencia).toFixed(2)}`}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        c.estado === 'ABIERTA' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {c.estado === 'ABIERTA' ? 'Abierta' : 'Cerrada'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tabla.total === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-400 font-medium">{cajas.length === 0 ? 'No hay registros de caja' : 'Sin resultados para el filtro'}</p>
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

      <Modal open={abrirModal} onClose={() => setAbrirModal(false)} title="Abrir Caja">
        <form onSubmit={handleAbrir} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monto Inicial (Bs.) *</label>
            <input type="number" step="0.01" min="0" value={montoInicial} onChange={e => setMontoInicial(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
            <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" placeholder="Opcional" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setAbrirModal(false)} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-medium rounded-xl hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 transition-all flex items-center gap-2">
              {saving && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              Abrir Caja
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={cerrarModal} onClose={() => setCerrarModal(false)} title="Cerrar Caja">
        <form onSubmit={handleCerrar} className="space-y-4">
          {cajaAbierta && (
            <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Monto Inicial</span><span className="font-mono">Bs. {Number(cajaAbierta.montoInicial).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Ingresos (efectivo)</span><span className="font-mono text-green-600">+Bs. {ingresos.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Egresos (devoluciones)</span><span className="font-mono text-red-600">-Bs. {egresos.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-slate-800 pt-1 border-t border-slate-200"><span>Saldo Esperado</span><span className="font-mono">Bs. {saldo.toFixed(2)}</span></div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monto contado en caja (Bs.) *</label>
            <input type="number" step="0.01" min="0" value={montoFinal} onChange={e => setMontoFinal(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
            <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" placeholder="Opcional" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setCerrarModal(false)} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-medium rounded-xl hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 transition-all flex items-center gap-2">
              {saving && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              Cerrar Caja
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
