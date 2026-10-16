import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { productosService } from '../services/productos.service'
import { ventasService } from '../services/ventas.service'
import { clientesService } from '../services/clientes.service'
import api from '../services/api'
import { Producto, Cliente } from '../types'
import { fechaLocal } from '../utils/fechas'

export default function Dashboard() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [ventas, setVentas] = useState<any[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [dailySales, setDailySales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [minPremio, setMinPremio] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([
      productosService.getAll(),
      ventasService.getAll(),
      clientesService.getAll(),
      api.get('/ventas/stats').then(r => r.data).catch(() => []),
      api.get('/premios', { params: { disponibles: 'true' } }).then(r => r.data).catch(() => []),
    ]).then(([p, v, c, d, pr]) => {
      // Puntos del premio más accesible: define a los clientes elegibles para canjear.
      setMinPremio(pr.length ? Math.min(...pr.map((x: any) => x.puntosRequeridos)) : null)
      setProductos(p.filter((x: Producto) => x.esActivo))
      // Los indicadores de ventas e ingresos consideran solo ventas COMPLETADAS.
      setVentas(v.filter((x: any) => x.estado === 'COMPLETADA'))
      setClientes(c)
      setDailySales(d)
    }).finally(() => setLoading(false))
  }, [])

  const stats = [
    {
      label: 'Productos',
      value: loading ? '...' : productos.length,
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      color: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-50', text: 'text-blue-600',
    },
    {
      label: 'Clientes',
      value: loading ? '...' : clientes.length,
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z',
      color: 'from-emerald-500 to-emerald-600',
      bg: 'bg-emerald-50', text: 'text-emerald-600',
    },
    {
      label: 'Ventas',
      value: loading ? '...' : ventas.length,
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
      color: 'from-violet-500 to-violet-600',
      bg: 'bg-violet-50', text: 'text-violet-600',
    },
    {
      label: 'Stock Bajo',
      value: loading ? '...' : productos.filter(p => p.stockActual <= p.stockMinimo).length,
      icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
      color: 'from-amber-500 to-amber-600',
      bg: 'bg-amber-50', text: 'text-amber-600',
    },
  ]

  const totalVentas = ventas.reduce((sum, v) => sum + Number(v.total), 0)
  const totalPuntos = clientes.reduce((sum, c) => sum + c.puntosAcumulados, 0)
  const elegibles = minPremio === null ? 0 : clientes.filter(c => c.puntosAcumulados >= minPremio).length
  const stockCriticos = productos.filter(p => p.stockActual <= p.stockMinimo)

  const clientesFieles = [...clientes]
    .sort((a, b) => b.puntosAcumulados - a.puntosAcumulados)
    .slice(0, 5)

  const formatoFecha = (f: string) => {
    const d = new Date(f + 'T00:00:00')
    return d.toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric' })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s, i) => (
          <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 animate-slide-up"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'backwards' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">{s.label}</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{s.value}</p>
              </div>
              <div className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center`}>
                <svg className={`w-6 h-6 ${s.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                </svg>
              </div>
            </div>
            <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full bg-gradient-to-r ${s.color} rounded-full transition-all duration-1000`}
                style={{ width: loading ? '0%' : `${Math.min(100, (Number(s.value) / 50) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 animate-slide-up" style={{ animationDelay: '250ms', animationFillMode: 'backwards' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Evolución de Ventas (7 días)</h3>
            <span className="text-xs text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">Bs.</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            </div>
          ) : dailySales.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-300">
              <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-sm font-medium">Sin datos de ventas en los últimos 7 días</p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 256 }}>
                <LineChart data={dailySales} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="fecha" tickFormatter={formatoFecha} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    labelFormatter={(l) => new Date(l + 'T00:00:00').toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' })}
                    formatter={(value) => [`Bs. ${Number(value).toFixed(2)}`, 'Total']}
                  />
                  <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 animate-slide-up" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Resumen Financiero</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Ingresos (ventas completadas)</p>
                  <p className="text-xl font-bold text-slate-800">Bs. {totalVentas.toFixed(2)}</p>
                </div>
              </div>
              <div className="text-right"><span className="text-2xl font-bold text-green-600">{ventas.length}</span><p className="text-[11px] text-slate-400">ventas</p></div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Clientes registrados</p>
                  <p className="text-xl font-bold text-slate-800">{clientes.length}</p>
                </div>
              </div>
              <div className="text-right"><span className="text-2xl font-bold text-blue-600">{elegibles}</span><p className="text-[11px] text-slate-400">pueden canjear</p></div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Puntos en circulación</p>
                  <p className="text-xl font-bold text-slate-800">{totalPuntos} pts</p>
                </div>
              </div>
              <div className="text-right"><span className="text-2xl font-bold text-amber-600">{clientes.filter(c => c.nivelFidelizacion === 'ORO' || c.nivelFidelizacion === 'PLATINO').length}</span><p className="text-[11px] text-slate-400">ORO / PLATINO</p></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 animate-slide-up" style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Productos con Stock Crítico</h3>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${stockCriticos.length > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              {stockCriticos.length} crítico(s)
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            </div>
          ) : stockCriticos.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-green-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p className="text-slate-400 font-medium">Todo en orden</p>
              <p className="text-slate-300 text-sm">No hay productos con stock bajo</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[240px] overflow-y-auto">
              {stockCriticos.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors animate-slide-down" style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'backwards' }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{p.nombre}</p>
                    <p className="text-xs text-slate-400 font-mono">{p.sku}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className={`text-sm font-bold ${p.stockActual === 0 ? 'text-red-600' : 'text-amber-600'}`}>{p.stockActual}</p>
                    <p className="text-xs text-slate-400">min: {p.stockMinimo}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 animate-slide-up" style={{ animationDelay: '450ms', animationFillMode: 'backwards' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Clientes Frecuentes</h3>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-600">Top 5</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            </div>
          ) : clientesFieles.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-slate-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <p className="text-slate-400 font-medium">Sin clientes registrados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {clientesFieles.map((c, i) => {
                const umbralOro = minPremio !== null && c.puntosAcumulados >= minPremio
                const umbralDescuento = minPremio !== null && c.puntosAcumulados >= minPremio * 0.7
                return (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-700' : 'bg-blue-400'}`}>
                      {c.nombre.charAt(0)}{c.apellido.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{c.nombre} {c.apellido}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">{c.numeroDocumento}</span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                          c.nivelFidelizacion === 'ORO' || c.nivelFidelizacion === 'PLATINO'
                            ? 'bg-yellow-50 text-yellow-600' : 'bg-slate-50 text-slate-500'
                        }`}>
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                          {c.nivelFidelizacion}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800">{c.puntosAcumulados} pts</p>
                      {umbralOro && <p className="text-xs text-yellow-500 font-medium">Puede canjear premios</p>}
                      {umbralDescuento && !umbralOro && <p className="text-xs text-blue-500 font-medium">Cerca de un premio</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 animate-slide-up" style={{ animationDelay: '500ms', animationFillMode: 'backwards' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <h4 className="text-sm font-bold text-slate-800">Producto más rentable</h4>
          </div>
          {loading ? <p className="text-sm text-slate-400 animate-pulse-soft">Cargando...</p> : (
            (() => {
              const prodMap: Record<string, { nombre: string; total: number; subtotal: number }> = {}
              ventas.forEach(v => v.detalles?.forEach((d: any) => {
                if (!prodMap[d.productoId]) prodMap[d.productoId] = { nombre: d.producto?.nombre || 'N/A', total: 0, subtotal: 0 }
                prodMap[d.productoId].total += d.cantidad
                prodMap[d.productoId].subtotal += Number(d.subtotal)
              }))
              const top = Object.values(prodMap).sort((a, b) => b.subtotal - a.subtotal)[0]
              return top ? (
                <div>
                  <p className="text-lg font-bold text-slate-800 truncate">{top.nombre}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Bs. {top.subtotal.toFixed(2)} en {top.total} unidad(es)</p>
                </div>
              ) : <p className="text-sm text-slate-400">Sin datos de ventas</p>
            })()
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 animate-slide-up" style={{ animationDelay: '550ms', animationFillMode: 'backwards' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h4 className="text-sm font-bold text-slate-800">Mejor vendedor del día</h4>
          </div>
          {loading ? <p className="text-sm text-slate-400 animate-pulse-soft">Cargando...</p> : (
            (() => {
              const hoy = fechaLocal(new Date())
              const ventasHoy = ventas.filter(v => fechaLocal(v.createdAt) === hoy)
              const vendedorMap: Record<string, { nombre: string; total: number }> = {}
              ventasHoy.forEach(v => {
                const id = v.usuario?.id || 'N/A'
                if (!vendedorMap[id]) vendedorMap[id] = { nombre: `${v.usuario?.nombre || ''} ${v.usuario?.apellido || ''}`.trim() || 'N/A', total: 0 }
                vendedorMap[id].total += Number(v.total)
              })
              const top = Object.values(vendedorMap).sort((a, b) => b.total - a.total)[0]
              return top ? (
                <div>
                  <p className="text-lg font-bold text-slate-800 truncate">{top.nombre}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Bs. {top.total.toFixed(2)} en ventas hoy</p>
                </div>
              ) : <p className="text-sm text-slate-400">Sin ventas hoy</p>
            })()
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 animate-slide-up" style={{ animationDelay: '600ms', animationFillMode: 'backwards' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h4 className="text-sm font-bold text-slate-800">Cliente con más compras</h4>
          </div>
          {loading ? <p className="text-sm text-slate-400 animate-pulse-soft">Cargando...</p> : (
            (() => {
              const cliMap: Record<string, { nombre: string; total: number; count: number }> = {}
              ventas.forEach(v => {
                const cliId = v.clienteId
                if (!cliId) return
                if (!cliMap[cliId]) cliMap[cliId] = { nombre: `${v.cliente?.nombre || ''} ${v.cliente?.apellido || ''}`.trim() || 'N/A', total: 0, count: 0 }
                cliMap[cliId].total += Number(v.total)
                cliMap[cliId].count += 1
              })
              const top = Object.values(cliMap).sort((a, b) => b.total - a.total)[0]
              return top ? (
                <div>
                  <p className="text-lg font-bold text-slate-800 truncate">{top.nombre}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{top.count} compra(s) · Bs. {top.total.toFixed(2)}</p>
                </div>
              ) : <p className="text-sm text-slate-400">Sin datos</p>
            })()
          )}
        </div>
      </div>
    </div>
  )
}
