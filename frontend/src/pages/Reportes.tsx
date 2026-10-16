import { useEffect, useState, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ventasService } from '../services/ventas.service'
import { productosService } from '../services/productos.service'
import { clientesService } from '../services/clientes.service'
import { usuariosService } from '../services/usuarios.service'
import { authService } from '../services/auth.service'
import { Venta, Producto, Cliente, Usuario } from '../types'
import { fechaLocal } from '../utils/fechas'
import { generarReportePDF } from '../utils/pdf'

type Tab = 'ventas-dia' | 'ventas-mes' | 'ranking' | 'productos-vendidos' | 'inventario' | 'precios'

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: 'ventas-dia', label: 'Ventas por Día', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { key: 'ventas-mes', label: 'Ventas por Mes', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { key: 'ranking', label: 'Ranking Clientes', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { key: 'productos-vendidos', label: 'Productos más Vendidos', icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4' },
  { key: 'inventario', label: 'Inventario', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { key: 'precios', label: 'Lista de Precios', icon: 'M7 7h.01M7 3h5a2 2 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z' },
]

function exportCSV(data: string[][], filename: string) {
  const csv = data.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `${filename}.csv`
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}

export default function Reportes() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  // Permite abrir una pestaña concreta desde «Reportes guardados» (/reportes?tab=inventario).
  const [searchParams] = useSearchParams()
  const tabInicial = searchParams.get('tab')
  const [tab, setTab] = useState<Tab>(tabs.some(t => t.key === tabInicial) ? (tabInicial as Tab) : 'ventas-dia')

  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [clienteFilter, setClienteFilter] = useState('')
  const [metodoPagoFilter, setMetodoPagoFilter] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [vendedorFilter, setVendedorFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    // Cada fuente se carga por separado: si una falla (p. ej. /usuarios es solo
    // para el administrador), el resto del reporte igual se muestra.
    Promise.allSettled([
      ventasService.getAll(),
      productosService.getAll(),
      clientesService.getAll(),
      // /usuarios es exclusivo del administrador; los demás roles arman la lista desde las ventas.
      authService.getUsuario()?.rol === 'Administrador' ? usuariosService.getAll() : Promise.reject(new Error('sin acceso')),
    ]).then(([v, p, c, u]) => {
      const ventasOk = v.status === 'fulfilled' ? v.value : []
      setVentas(ventasOk)
      if (p.status === 'fulfilled') setProductos(p.value)
      if (c.status === 'fulfilled') setClientes(c.value)
      if (u.status === 'fulfilled') setUsuarios(u.value)
      else {
        // Sin acceso a /usuarios: se arma la lista de vendedores desde las ventas.
        const vistos = new Map<string, Usuario>()
        ventasOk.forEach(x => { if (x.usuario?.id) vistos.set(x.usuario.id, x.usuario) })
        setUsuarios([...vistos.values()])
      }
    }).finally(() => setLoading(false))
  }, [])

  const metodosPago = [...new Set(ventas.map(v => v.metodoPago).filter(Boolean))]

  // Los ingresos solo consideran ventas COMPLETADAS (no anuladas ni por autorizar).
  const totalVentas = ventas.filter(v => v.estado === 'COMPLETADA').reduce((s, v) => s + Number(v.total), 0)
  const completadas = ventas.filter(v => v.estado === 'COMPLETADA').length
  const totalProductos = productos.filter(p => p.esActivo).length
  const stockBajo = productos.filter(p => p.esActivo && p.stockActual <= p.stockMinimo).length

  const ventasFiltradas = useMemo(() => {
    return ventas.filter(v => {
      if (fechaDesde && new Date(v.createdAt) < new Date(fechaDesde + 'T00:00:00')) return false
      if (fechaHasta && new Date(v.createdAt) > new Date(fechaHasta + 'T23:59:59')) return false
      if (clienteFilter && v.clienteId !== clienteFilter) return false
      if (metodoPagoFilter && v.metodoPago !== metodoPagoFilter) return false
      // Sin filtro de estado se reportan las ventas completadas (las que generan ingresos).
      if (estadoFilter ? v.estado !== estadoFilter : v.estado !== 'COMPLETADA') return false
      if (vendedorFilter && v.usuario?.id !== vendedorFilter) return false
      return true
    })
  }, [ventas, fechaDesde, fechaHasta, clienteFilter, metodoPagoFilter, estadoFilter, vendedorFilter])

  const ventasPorDia = useMemo(() => {
    const map: Record<string, { fecha: string; total: number; cantidad: number }> = {}
    ventasFiltradas.forEach(v => {
      const key = fechaLocal(v.createdAt)
      if (!map[key]) map[key] = { fecha: key, total: 0, cantidad: 0 }
      map[key].total += Number(v.total)
      map[key].cantidad += 1
    })
    return Object.values(map).sort((a, b) => b.fecha.localeCompare(a.fecha))
  }, [ventasFiltradas])

  const ventasPorMes = useMemo(() => {
    const map: Record<string, { mes: string; total: number; cantidad: number }> = {}
    ventasFiltradas.forEach(v => {
      const d = new Date(v.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map[key]) map[key] = { mes: key, total: 0, cantidad: 0 }
      map[key].total += Number(v.total)
      map[key].cantidad += 1
    })
    return Object.values(map).sort((a, b) => b.mes.localeCompare(a.mes))
  }, [ventasFiltradas])

  const rankingClientes = useMemo(() => {
    const map: Record<string, { nombre: string; total: number; puntos: number; compras: number; nivel: string }> = {}
    ventasFiltradas.forEach(v => {
      const cliId = v.clienteId
      if (!cliId) return
      if (!map[cliId]) {
        const c = clientes.find(cl => cl.id === cliId)
        map[cliId] = { nombre: c ? `${c.nombre} ${c.apellido}` : 'N/A', total: 0, puntos: c?.puntosAcumulados || 0, compras: 0, nivel: c?.nivelFidelizacion || 'BRONCE' }
      }
      map[cliId].total += Number(v.total)
      map[cliId].compras += 1
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [ventasFiltradas, clientes])

  // Productos más vendidos: agrega las líneas de detalle de las ventas filtradas.
  const productosVendidos = useMemo(() => {
    const map: Record<string, { id: string; nombre: string; sku: string; cantidad: number; total: number; ventas: number }> = {}
    ventasFiltradas.forEach(v => {
      (v.detalles || []).forEach(d => {
        const pid = d.productoId || d.producto?.id
        if (!pid) return
        if (!map[pid]) map[pid] = { id: pid, nombre: d.producto?.nombre || 'N/A', sku: d.producto?.sku || '-', cantidad: 0, total: 0, ventas: 0 }
        map[pid].cantidad += Number(d.cantidad)
        map[pid].total += Number(d.subtotal)
        map[pid].ventas += 1
      })
    })
    return Object.values(map).sort((a, b) => b.cantidad - a.cantidad)
  }, [ventasFiltradas])

  const productosVendidosFiltrados = useMemo(() => {
    return productosVendidos.filter(p =>
      !searchQuery ||
      p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [productosVendidos, searchQuery])

  // Descripción legible de los filtros activos, para el encabezado de los PDF.
  const descripcionFiltros = useMemo(() => {
    const f: string[] = []
    if (fechaDesde) f.push(`Desde: ${fechaDesde}`)
    if (fechaHasta) f.push(`Hasta: ${fechaHasta}`)
    if (clienteFilter) {
      const c = clientes.find(x => x.id === clienteFilter)
      f.push(`Cliente: ${c ? `${c.nombre} ${c.apellido}` : clienteFilter}`)
    }
    if (metodoPagoFilter) f.push(`Método de pago: ${metodoPagoFilter}`)
    if (estadoFilter) f.push(`Estado: ${estadoFilter}`)
    if (vendedorFilter) {
      const u = usuarios.find(x => x.id === vendedorFilter)
      f.push(`Vendedor: ${u ? `${u.nombre} ${u.apellido}` : vendedorFilter}`)
    } else f.push('Estado: Completadas')
    if (searchQuery) f.push(`Búsqueda: ${searchQuery}`)
    return f
  }, [fechaDesde, fechaHasta, clienteFilter, metodoPagoFilter, estadoFilter, vendedorFilter, searchQuery, clientes, usuarios])

  const inventarioFiltrado = useMemo(() => {
    return productos.filter(p => p.esActivo).filter(p =>
      !searchQuery ||
      p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [productos, searchQuery])

  const totalFiltradoDia = ventasPorDia.reduce((s, r) => s + r.total, 0)
  const totalFiltradoMes = ventasPorMes.reduce((s, r) => s + r.total, 0)
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  const exportTab = useCallback(() => {
    const filename = `reporte-${tab}-${fechaLocal(new Date())}`
    if (tab === 'ventas-dia') {
      const rows = [['Fecha', 'Cantidad Ventas', 'Total Bs.']]
      ventasPorDia.forEach(r => rows.push([r.fecha, String(r.cantidad), r.total.toFixed(2)]))
      rows.push(['TOTAL', '', totalFiltradoDia.toFixed(2)])
      exportCSV(rows, filename)
    } else if (tab === 'ventas-mes') {
      const rows = [['Mes', 'Cantidad Ventas', 'Total Bs.']]
      ventasPorMes.forEach(r => rows.push([r.mes, String(r.cantidad), r.total.toFixed(2)]))
      rows.push(['TOTAL', '', totalFiltradoMes.toFixed(2)])
      exportCSV(rows, filename)
    } else if (tab === 'ranking') {
      const rows = [['#', 'Cliente', 'Compras', 'Total Bs.', 'Puntos']]
      rankingClientes.forEach((c, i) => rows.push([String(i + 1), c.nombre, String(c.compras), c.total.toFixed(2), String(c.puntos)]))
      exportCSV(rows, filename)
    } else if (tab === 'productos-vendidos') {
      const rows = [['#', 'Producto', 'SKU', 'Cantidad Vendida', 'Total Bs.']]
      productosVendidosFiltrados.forEach((p, i) => rows.push([String(i + 1), p.nombre, p.sku, String(p.cantidad), p.total.toFixed(2)]))
      exportCSV(rows, filename)
    } else if (tab === 'inventario') {
      const rows = [['Producto', 'SKU', 'Stock', 'Precio Bs.', 'Margen %']]
      inventarioFiltrado.forEach(p => {
        const margen = p.costoPromedio ? ((Number(p.precioBase) - Number(p.costoPromedio)) / Number(p.costoPromedio) * 100).toFixed(1) : '-'
        rows.push([p.nombre, p.sku, String(p.stockActual), Number(p.precioBase).toFixed(2), margen])
      })
      exportCSV(rows, filename)
    } else {
      const rows = [['Producto', 'SKU', 'Categoría', 'Unidad', 'Precio Base Bs.', 'Precio Mayorista Bs.']]
      inventarioFiltrado.forEach(p => rows.push([
        p.nombre,
        p.sku,
        p.categoria?.nombre || '-',
        p.unidadMedida || 'unidad',
        Number(p.precioBase).toFixed(2),
        p.precioMayorista != null ? Number(p.precioMayorista).toFixed(2) : '-',
      ]))
      exportCSV(rows, filename)
    }
  }, [tab, ventasPorDia, ventasPorMes, rankingClientes, productosVendidosFiltrados, inventarioFiltrado, totalFiltradoDia, totalFiltradoMes])

  const exportPDF = useCallback(() => {
    const nombre = `reporte-${tab}-${fechaLocal(new Date())}`
    const etiqueta = tabs.find(t => t.key === tab)?.label || 'Reporte'
    const base = { titulo: `Reporte: ${etiqueta}`, filtros: descripcionFiltros, nombreArchivo: nombre }
    if (tab === 'ventas-dia') {
      generarReportePDF({
        ...base,
        columnas: ['Fecha', 'Cantidad Ventas', 'Total Bs.'],
        filas: ventasPorDia.map(r => [r.fecha, r.cantidad, r.total.toFixed(2)]),
        totales: ['TOTAL', ventasPorDia.reduce((s, r) => s + r.cantidad, 0), totalFiltradoDia.toFixed(2)],
      })
    } else if (tab === 'ventas-mes') {
      generarReportePDF({
        ...base,
        columnas: ['Mes', 'Cantidad Ventas', 'Total Bs.'],
        filas: ventasPorMes.map(r => {
          const [year, month] = r.mes.split('-')
          return [`${meses[parseInt(month) - 1]} ${year}`, r.cantidad, r.total.toFixed(2)]
        }),
        totales: ['TOTAL', ventasPorMes.reduce((s, r) => s + r.cantidad, 0), totalFiltradoMes.toFixed(2)],
      })
    } else if (tab === 'ranking') {
      generarReportePDF({
        ...base,
        subtitulo: 'Clientes ordenados por monto de compra (quién compró más)',
        columnas: ['#', 'Cliente', 'Nivel', 'Compras', 'Total Bs.', 'Puntos'],
        filas: rankingClientes.map((c, i) => [i + 1, c.nombre, c.nivel, c.compras, c.total.toFixed(2), c.puntos]),
      })
    } else if (tab === 'productos-vendidos') {
      generarReportePDF({
        ...base,
        columnas: ['#', 'Producto', 'SKU', 'Cantidad Vendida', 'Total Bs.'],
        filas: productosVendidosFiltrados.map((p, i) => [i + 1, p.nombre, p.sku, p.cantidad, p.total.toFixed(2)]),
        totales: ['', 'TOTAL', '', productosVendidosFiltrados.reduce((s, p) => s + p.cantidad, 0), productosVendidosFiltrados.reduce((s, p) => s + p.total, 0).toFixed(2)],
      })
    } else if (tab === 'inventario') {
      generarReportePDF({
        ...base,
        columnas: ['Producto', 'SKU', 'Stock', 'Precio Bs.', 'Margen %'],
        filas: inventarioFiltrado.map(p => {
          const margen = p.costoPromedio ? ((Number(p.precioBase) - Number(p.costoPromedio)) / Number(p.costoPromedio) * 100).toFixed(1) : '-'
          return [p.nombre, p.sku, p.stockActual, Number(p.precioBase).toFixed(2), margen]
        }),
      })
    } else {
      generarReportePDF({
        ...base,
        columnas: ['Producto', 'SKU', 'Categoría', 'Unidad', 'Precio Base Bs.', 'Precio Mayorista Bs.'],
        filas: inventarioFiltrado.map(p => [
          p.nombre,
          p.sku,
          p.categoria?.nombre || '-',
          p.unidadMedida || 'unidad',
          Number(p.precioBase).toFixed(2),
          p.precioMayorista != null ? Number(p.precioMayorista).toFixed(2) : '-',
        ]),
      })
    }
  }, [tab, ventasPorDia, ventasPorMes, rankingClientes, productosVendidosFiltrados, inventarioFiltrado, totalFiltradoDia, totalFiltradoMes, descripcionFiltros])

  return (
    <div className="animate-fade-in space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Ventas', value: loading ? '...' : ventas.length, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', text: 'text-blue-600', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
          { label: 'Completadas', value: loading ? '...' : completadas, color: 'from-green-500 to-emerald-600', bg: 'bg-green-50', text: 'text-green-600', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
          { label: 'Productos Activos', value: loading ? '...' : totalProductos, color: 'from-violet-500 to-violet-600', bg: 'bg-violet-50', text: 'text-violet-600', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
          { label: 'Stock Bajo', value: loading ? '...' : stockBajo, color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', text: 'text-amber-600', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z' },
        ].map((s, i) => (
          <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 animate-slide-up"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'backwards' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{s.label}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{s.value}</p>
              </div>
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>
                <svg className={`w-5 h-5 ${s.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="print-area bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Reportes</h3>
            <p className="text-sm text-slate-400 mt-0.5">Ingresos totales: <strong className="text-slate-700 font-mono">Bs. {totalVentas.toFixed(2)}</strong></p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <button onClick={exportTab} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all text-sm shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar CSV
            </button>
            <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-medium hover:from-red-600 hover:to-rose-700 transition-all text-sm shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15h6M9 11h3" />
              </svg>
              Exportar PDF
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl font-medium hover:from-slate-700 hover:to-slate-800 transition-all text-sm shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6 print:hidden">
          <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  tab === t.key ? 'bg-blue-600 text-white shadow-sm shadow-blue-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                </svg>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6 p-4 bg-slate-50 rounded-xl print:hidden">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Desde</label>
            <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Hasta</label>
            <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Cliente</label>
            <select value={clienteFilter} onChange={e => setClienteFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all">
              <option value="">Todos</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Método Pago</label>
            <select value={metodoPagoFilter} onChange={e => setMetodoPagoFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all">
              <option value="">Todos</option>
              {metodosPago.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Estado</label>
            <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all">
              <option value="">Completadas (por defecto)</option>
              <option value="PENDIENTE">Por autorizar</option>
              <option value="ANULADA">Anuladas</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Vendedor</label>
            <select value={vendedorFilter} onChange={e => setVendedorFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all">
              <option value="">Todos</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>)}
            </select>
          </div>
        </div>

        {(fechaDesde || fechaHasta || clienteFilter || metodoPagoFilter || estadoFilter || vendedorFilter || ((tab === 'inventario' || tab === 'precios' || tab === 'productos-vendidos') && searchQuery)) && (
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => { setFechaDesde(''); setFechaHasta(''); setClienteFilter(''); setMetodoPagoFilter(''); setEstadoFilter(''); setVendedorFilter(''); setSearchQuery('') }}
              className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              Limpiar todos los filtros
            </button>
          </div>
        )}

        {(tab === 'inventario' || tab === 'precios' || tab === 'productos-vendidos') && (
          <div className="relative mb-6">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar producto por nombre o SKU..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : (
          <>
            {tab === 'ventas-dia' && (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 bg-slate-50/80">
                      <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">Fecha</th>
                      <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">Ventas</th>
                      <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {ventasPorDia.map(r => (
                      <tr key={r.fecha} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">{r.cantidad}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold font-mono text-slate-800">Bs. {r.total.toFixed(2)}</td>
                      </tr>
                    ))}
                    {ventasPorDia.length > 0 && (
                      <tr className="bg-slate-50/50 font-semibold">
                        <td className="py-3 px-4 text-slate-700 uppercase text-xs tracking-wider">Total General</td>
                        <td className="py-3 px-4"><span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">{ventasPorDia.reduce((s, r) => s + r.cantidad, 0)}</span></td>
                        <td className="py-3 px-4 text-right font-bold font-mono text-slate-800">Bs. {totalFiltradoDia.toFixed(2)}</td>
                      </tr>
                    )}
                    {ventasPorDia.length === 0 && (
                      <tr><td colSpan={3} className="py-12 text-center text-slate-400">Sin ventas en el período seleccionado</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'ventas-mes' && (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 bg-slate-50/80">
                      <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">Mes</th>
                      <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">Ventas</th>
                      <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {ventasPorMes.map(r => {
                      const [year, month] = r.mes.split('-')
                      return (
                        <tr key={r.mes} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-medium text-slate-800 capitalize">{meses[parseInt(month) - 1]} {year}</td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">{r.cantidad}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold font-mono text-slate-800">Bs. {r.total.toFixed(2)}</td>
                        </tr>
                      )
                    })}
                    {ventasPorMes.length > 0 && (
                      <tr className="bg-slate-50/50 font-semibold">
                        <td className="py-3 px-4 text-slate-700 uppercase text-xs tracking-wider">Total General</td>
                        <td className="py-3 px-4"><span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">{ventasPorMes.reduce((s, r) => s + r.cantidad, 0)}</span></td>
                        <td className="py-3 px-4 text-right font-bold font-mono text-slate-800">Bs. {totalFiltradoMes.toFixed(2)}</td>
                      </tr>
                    )}
                    {ventasPorMes.length === 0 && (
                      <tr><td colSpan={3} className="py-12 text-center text-slate-400">Sin ventas en el período seleccionado</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'ranking' && (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 bg-slate-50/80">
                      <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">#</th>
                      <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">Cliente</th>
                      <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">Compras</th>
                      <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-right">Total</th>
                      <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-right">Puntos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rankingClientes.map((c, i) => (
                      <tr key={c.nombre + i} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${
                            i === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500' :
                            i === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-500' :
                            i === 2 ? 'bg-gradient-to-br from-amber-700 to-amber-800' :
                            'bg-slate-100 text-slate-500'
                          }`}>{i + 1}</span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-800">{c.nombre}</p>
                          <p className="text-xs text-slate-400">{c.nivel}</p>
                        </td>
                        <td className="py-3 px-4">{c.compras}</td>
                        <td className="py-3 px-4 text-right font-medium font-mono text-slate-800">Bs. {c.total.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-700">{c.puntos} pts</td>
                      </tr>
                    ))}
                    {rankingClientes.length === 0 && (
                      <tr><td colSpan={5} className="py-12 text-center text-slate-400">Sin ventas registradas</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'productos-vendidos' && (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 bg-slate-50/80">
                      <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">#</th>
                      <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">Producto</th>
                      <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">SKU</th>
                      <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-right">Cantidad Vendida</th>
                      <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {productosVendidosFiltrados.map((p, i) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${
                            i === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500' :
                            i === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-500' :
                            i === 2 ? 'bg-gradient-to-br from-amber-700 to-amber-800' :
                            'bg-slate-100 text-slate-500'
                          }`}>{i + 1}</span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">{p.nombre}</td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-500">{p.sku}</td>
                        <td className="py-3 px-4 text-right">
                          <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">{p.cantidad}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium font-mono text-slate-800">Bs. {p.total.toFixed(2)}</td>
                      </tr>
                    ))}
                    {productosVendidosFiltrados.length > 0 && (
                      <tr className="bg-slate-50/50 font-semibold">
                        <td className="py-3 px-4" />
                        <td className="py-3 px-4 text-slate-700 uppercase text-xs tracking-wider">Total General</td>
                        <td className="py-3 px-4" />
                        <td className="py-3 px-4 text-right font-bold text-slate-800">{productosVendidosFiltrados.reduce((s, p) => s + p.cantidad, 0)}</td>
                        <td className="py-3 px-4 text-right font-bold font-mono text-slate-800">Bs. {productosVendidosFiltrados.reduce((s, p) => s + p.total, 0).toFixed(2)}</td>
                      </tr>
                    )}
                    {productosVendidosFiltrados.length === 0 && (
                      <tr><td colSpan={5} className="py-12 text-center text-slate-400">
                        {searchQuery ? 'Sin resultados para tu búsqueda' : 'Sin ventas en el período seleccionado'}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'inventario' && (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 bg-slate-50/80">
                      <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">Producto</th>
                      <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">SKU</th>
                      <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">Stock</th>
                      <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-right">Precio</th>
                      <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-right">Margen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {inventarioFiltrado.map(p => {
                      const margen = p.costoPromedio ? ((Number(p.precioBase) - Number(p.costoPromedio)) / Number(p.costoPromedio) * 100) : null
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {p.rutaImagen && (
                                <img src={p.rutaImagen} alt="" className="w-8 h-8 rounded-lg object-cover bg-slate-100 ring-1 ring-slate-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                              )}
                              <div>
                                <p className="font-medium text-slate-800">{p.nombre}</p>
                                {p.stockActual <= p.stockMinimo && (
                                  <span className="text-xs text-red-500 font-medium flex items-center gap-1 mt-0.5">
                                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse-soft" />
                                    Stock bajo
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-500">{p.sku}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              p.stockActual <= p.stockMinimo ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                            }`}>
                              {p.stockActual} {p.unidadMedida || 'u'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-medium text-slate-800">Bs. {Number(p.precioBase).toFixed(2)}</td>
                          <td className="py-3 px-4 text-right">
                            {margen !== null ? (
                              <span className={`font-medium ${margen >= 30 ? 'text-green-600' : margen >= 15 ? 'text-amber-600' : 'text-red-600'}`}>
                                {margen.toFixed(1)}%
                              </span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                        </tr>
                      )
                    })}
                    {inventarioFiltrado.length === 0 && (
                      <tr><td colSpan={5} className="py-12 text-center text-slate-400">
                        {searchQuery ? 'Sin resultados para tu búsqueda' : 'No hay productos activos'}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'precios' && (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 bg-slate-50/80">
                      <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">Producto</th>
                      <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">SKU</th>
                      <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">Categoría</th>
                      <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">Unidad</th>
                      <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-right">Precio Base</th>
                      <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-right">Precio Mayorista</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {inventarioFiltrado.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {p.rutaImagen && (
                              <img src={p.rutaImagen} alt="" className="w-8 h-8 rounded-lg object-cover bg-slate-100 ring-1 ring-slate-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                            )}
                            <p className="font-medium text-slate-800">{p.nombre}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-500">{p.sku}</td>
                        <td className="py-3 px-4 text-slate-600">{p.categoria?.nombre || <span className="text-slate-300">—</span>}</td>
                        <td className="py-3 px-4 text-slate-600 capitalize">{p.unidadMedida || 'unidad'}</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">Bs. {Number(p.precioBase).toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          {p.precioMayorista != null ? `Bs. ${Number(p.precioMayorista).toFixed(2)}` : <span className="text-slate-300">—</span>}
                        </td>
                      </tr>
                    ))}
                    {inventarioFiltrado.length === 0 && (
                      <tr><td colSpan={6} className="py-12 text-center text-slate-400">
                        {searchQuery ? 'Sin resultados para tu búsqueda' : 'No hay productos registrados'}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
