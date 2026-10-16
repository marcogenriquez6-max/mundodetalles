import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ventasService } from '../services/ventas.service'
import { productosService } from '../services/productos.service'
import { clientesService } from '../services/clientes.service'
import { autorizacionesService } from '../services/autorizaciones.service'
import { authService } from '../services/auth.service'
import { getSocket, AutorizacionRespondidaEvt } from '../services/realtime'
import { Venta, Producto, Cliente, Autorizacion } from '../types'
import Modal from '../components/Modal'
import ClienteBuscador from '../components/ClienteBuscador'
import TicketPrint from '../components/TicketPrint'
import { useTabla } from '../hooks/useTabla'
import Paginador from '../components/Paginador'
import ThOrdenable from '../components/ThOrdenable'
import Swal from 'sweetalert2'
import { esc } from '../utils/html'

const estadoStyle = (estado: string) => {
  const map: Record<string, string> = {
    COMPLETADA: 'bg-green-50 text-green-600 border-green-200',
    PENDIENTE: 'bg-amber-50 text-amber-600 border-amber-200',
    ANULADA: 'bg-red-50 text-red-600 border-red-200',
    REEMBOLSADA: 'bg-blue-50 text-blue-600 border-blue-200',
  }
  return map[estado] || 'bg-gray-100 text-gray-700'
}
const estadoDot = (estado: string) =>
  estado === 'COMPLETADA' ? 'bg-green-500' : estado === 'PENDIENTE' ? 'bg-amber-500' : estado === 'ANULADA' ? 'bg-red-500' : 'bg-blue-500'
const estadoLabel = (estado: string) => (estado === 'PENDIENTE' ? 'POR AUTORIZAR' : estado)

const bs = (n: number | string | undefined | null) => `Bs. ${Number(n || 0).toFixed(2)}`

const valorVenta = (v: Venta, key: string): string | number => {
  switch (key) {
    case 'comprobante': return v.codigoComprobante || ''
    case 'cliente': return v.cliente ? `${v.cliente.nombre} ${v.cliente.apellido}` : ''
    case 'total': return Number(v.total)
    case 'puntos': return v.puntosGenerados
    case 'estado': return v.estado
    case 'fecha': return new Date(v.createdAt).getTime()
    default: return ''
  }
}

interface LineItem {
  productoId: string
  productoNombre: string
  cantidad: number
  precioUnitario: number
}

const IconSpinner = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
)
const IconPrint = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
  </svg>
)

export default function Ventas() {
  const usuario = authService.getUsuario()
  const rol: string | undefined = usuario?.rol
  const esAdmin = rol === 'Administrador'
  const puedeAnular = rol === 'Administrador' || rol === 'Cajero'

  const [searchParams, setSearchParams] = useSearchParams()
  const tab = esAdmin && searchParams.get('tab') === 'autorizaciones' ? 'autorizaciones' : 'ventas'
  const setTab = (t: 'ventas' | 'autorizaciones') => setSearchParams(t === 'ventas' ? {} : { tab: t })
  // Solo el administrador tiene la pestaña de autorizaciones: se limpia el parámetro para otros roles.
  useEffect(() => {
    if (!esAdmin && searchParams.get('tab')) setSearchParams({}, { replace: true })
  }, [esAdmin, searchParams, setSearchParams])

  const [ventas, setVentas] = useState<Venta[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Venta | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [productos, setProductos] = useState<Producto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])

  const [codigoComprobante, setCodigoComprobante] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [items, setItems] = useState<LineItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [metodoPago, setMetodoPago] = useState('EFECTIVO')
  const [showTicket, setShowTicket] = useState(false)
  const [ticketVenta, setTicketVenta] = useState<Venta | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [busquedaProd, setBusquedaProd] = useState('')

  // Alta rápida de cliente sin salir de la venta
  const [nuevoClienteOpen, setNuevoClienteOpen] = useState(false)
  const [guardandoCliente, setGuardandoCliente] = useState(false)
  const [nuevoCliente, setNuevoCliente] = useState({
    tipoDocumento: 'CI',
    numeroDocumento: '',
    nombre: '',
    apellido: '',
    telefono: '',
    email: '',
    direccion: '',
  })

  // Precio negociado (requiere autorización del administrador)
  const [conDescuento, setConDescuento] = useState(false)
  const [precioNegociado, setPrecioNegociado] = useState('')
  const [motivoDescuento, setMotivoDescuento] = useState('')

  // Venta en espera de respuesta del administrador
  const [esperando, setEsperando] = useState<Venta | null>(null)
  const esperandoRef = useRef<Venta | null>(null)
  esperandoRef.current = esperando

  // Panel de autorizaciones (administrador)
  const [pendientes, setPendientes] = useState<Autorizacion[]>([])
  const [historial, setHistorial] = useState<Autorizacion[]>([])
  const [respondiendo, setRespondiendo] = useState<string | null>(null)

  const loadVentas = useCallback(async () => {
    try {
      const data = await ventasService.getAll()
      setVentas(data)
    } catch {
      Swal.fire('Error', 'No se pudieron cargar las ventas', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadAutorizaciones = useCallback(async () => {
    if (!esAdmin) return
    try {
      const [p, todas] = await Promise.all([autorizacionesService.getPendientes(), autorizacionesService.getAll()])
      setPendientes(p)
      setHistorial(todas.filter((a) => a.estado !== 'PENDIENTE').slice(0, 10))
    } catch {
      /* el listado de ventas sigue disponible */
    }
  }, [esAdmin])

  useEffect(() => {
    loadVentas()
    loadAutorizaciones()
  }, [loadVentas, loadAutorizaciones])

  // Tiempo real: refrescar al llegar o responderse una solicitud.
  useEffect(() => {
    const socket = getSocket()
    const onPendiente = () => {
      loadAutorizaciones()
      loadVentas()
    }
    const onRespondida = async (evt: AutorizacionRespondidaEvt) => {
      loadAutorizaciones()
      loadVentas()
      const actual = esperandoRef.current
      if (actual && actual.id === evt.ventaId) await mostrarResultado(evt.ventaId)
    }
    socket.on('autorizacion-pendiente', onPendiente)
    socket.on('autorizacion-respondida', onRespondida)
    return () => {
      socket.off('autorizacion-pendiente', onPendiente)
      socket.off('autorizacion-respondida', onRespondida)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAutorizaciones, loadVentas])

  // Respaldo si el WebSocket no está disponible: consultar el estado cada 5 s.
  useEffect(() => {
    if (!esperando) return
    const t = setInterval(async () => {
      try {
        const v = await ventasService.getById(esperando.id)
        if (v.estado !== 'PENDIENTE' && esperandoRef.current?.id === v.id) await mostrarResultado(v.id)
      } catch { /* reintenta */ }
    }, 5000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esperando])

  const mostrarResultado = async (ventaId: string) => {
    if (esperandoRef.current?.id !== ventaId) return
    esperandoRef.current = null
    setEsperando(null)
    const v = await ventasService.getById(ventaId)
    loadVentas()
    if (v.estado === 'COMPLETADA') {
      const aprobada = v.autorizacion?.estado === 'APROBADA'
      await Swal.fire(
        aprobada ? 'Descuento autorizado' : 'Descuento rechazado',
        aprobada
          ? `La venta se cobró a ${bs(v.total)} (descuento de ${bs(v.descuento)}).`
          : `La venta se completó al precio de lista: ${bs(v.total)}.${v.autorizacion?.motivoRespuesta ? `<br><small>Motivo: ${esc(v.autorizacion.motivoRespuesta)}</small>` : ''}`,
        aprobada ? 'success' : 'warning',
      )
      setTicketVenta(v)
      setShowTicket(true)
    } else if (v.estado === 'ANULADA') {
      Swal.fire('Venta cancelada', 'La venta fue anulada antes de recibir respuesta.', 'info')
    }
  }

  const openCreate = async () => {
    setShowCreate(true)
    // Numeración correlativa de notas de venta (NV-000001, NV-000002, ...).
    const siguiente = (lista: Venta[]) => {
      const max = lista.reduce((m, v) => Math.max(m, Number(/^NV-(\d+)$/.exec(v.codigoComprobante || '')?.[1] || 0)), 0)
      return `NV-${String(max + 1).padStart(6, '0')}`
    }
    setCodigoComprobante(siguiente(ventas))
    ventasService.getAll().then(l => setCodigoComprobante(siguiente(l))).catch(() => {})
    setClienteId('')
    setMetodoPago('EFECTIVO')
    setItems([])
    setBusquedaProd('')
    setConDescuento(false)
    setPrecioNegociado('')
    setMotivoDescuento('')
    try {
      const [p, c] = await Promise.all([productosService.getAll(), clientesService.getAll()])
      setProductos(p)
      setClientes(c)
    } catch {
      Swal.fire('Error', 'No se pudo cargar el catálogo', 'error')
    }
  }

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx))

  // Agrega un producto al carrito; si ya está, incrementa su cantidad (respetando el stock).
  const addProductoToCart = (p: Producto) => {
    const existente = items.find((i) => i.productoId === p.id)
    if (existente) {
      if (existente.cantidad >= p.stockActual) return
      setItems(items.map((i) => (i.productoId === p.id ? { ...i, cantidad: i.cantidad + 1 } : i)))
    } else {
      setItems([...items, { productoId: p.id, productoNombre: p.nombre, cantidad: 1, precioUnitario: Number(p.precioBase) }])
    }
  }

  // Ajusta la cantidad de una línea; si baja de 1, la elimina.
  const setCantidad = (idx: number, n: number) => {
    if (n < 1) { removeItem(idx); return }
    const it = items[idx]
    const stock = productos.find((p) => p.id === it.productoId)?.stockActual ?? 9999
    setItems(items.map((i, k) => (k === idx ? { ...i, cantidad: Math.min(stock, n) } : i)))
  }

  const subtotal = items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0)
  const precioNum = Number(precioNegociado)
  const descuentoValido = conDescuento && precioNum > 0 && precioNum < subtotal && motivoDescuento.trim().length >= 5
  const totalMostrar = conDescuento && precioNum > 0 && precioNum < subtotal ? precioNum : subtotal
  const productosDisponibles = productos.filter((p) => {
    if (!p.esActivo || p.stockActual <= 0) return false
    const q = busquedaProd.trim().toLowerCase()
    return !q || p.nombre.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
  })

  const guardarNuevoCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardandoCliente(true)
    try {
      const creado = await clientesService.create({
        tipoDocumento: nuevoCliente.tipoDocumento,
        numeroDocumento: nuevoCliente.numeroDocumento.trim(),
        nombre: nuevoCliente.nombre.trim(),
        apellido: nuevoCliente.apellido.trim(),
        telefono: nuevoCliente.telefono.trim() || undefined,
        email: nuevoCliente.email.trim() || undefined,
        direccion: nuevoCliente.direccion.trim() || undefined,
      } as any)
      setClientes((prev) => [...prev, creado])
      setClienteId(creado.id)
      setNuevoClienteOpen(false)
      setNuevoCliente({ tipoDocumento: 'CI', numeroDocumento: '', nombre: '', apellido: '', telefono: '', email: '', direccion: '' })
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Cliente registrado', showConfirmButton: false, timer: 2000 })
    } catch (err: any) {
      const msg = err?.response?.data?.message
      Swal.fire('Error', Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo registrar el cliente', 'error')
    } finally {
      setGuardandoCliente(false)
    }
  }

  const handleCreate = async () => {
    if (!usuario || !codigoComprobante || items.length === 0) return
    if (conDescuento && !descuentoValido) {
      Swal.fire('Precio negociado', 'Indique un precio menor al subtotal y el motivo del descuento (mínimo 5 caracteres).', 'warning')
      return
    }
    setSubmitting(true)
    try {
      const ventaCreada = await ventasService.create({
        codigoComprobante,
        tipoComprobante: 'NOTA_VENTA',
        clienteId: clienteId || undefined,
        metodoPago,
        detalles: items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad })),
        ...(conDescuento ? { precioSolicitado: precioNum, motivoDescuento: motivoDescuento.trim() } : {}),
      })
      setShowCreate(false)
      loadVentas()
      if (ventaCreada.estado === 'PENDIENTE') {
        setEsperando(ventaCreada)
      } else {
        setTicketVenta(ventaCreada)
        setShowTicket(true)
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message
      Swal.fire('Error', Array.isArray(msg) ? msg.join(', ') : msg || 'Error al crear venta. Verifica que el stock sea suficiente.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAnular = async (v: Venta) => {
    const { value: motivo, isConfirmed } = await Swal.fire({
      title: `Anular ${v.codigoComprobante}`,
      text: 'El stock se repone (Kardex) y se revierten los puntos otorgados.',
      input: 'text',
      inputPlaceholder: 'Motivo de la anulación',
      inputValidator: (val) => (!val || val.trim().length < 3 ? 'Indique el motivo (mínimo 3 caracteres)' : undefined),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Anular venta',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#dc2626',
    })
    if (!isConfirmed || !motivo) return
    try {
      await ventasService.anular(v.id, motivo.trim())
      Swal.fire('Venta anulada', 'Se repuso el stock y se revirtieron los puntos.', 'success')
      setSelected(null)
      loadVentas()
      loadAutorizaciones()
    } catch (err: any) {
      Swal.fire('No se pudo anular', err?.response?.data?.message || 'Error al anular la venta', 'error')
    }
  }

  const responder = async (a: Autorizacion, accion: 'aprobar' | 'modificar' | 'rechazar') => {
    const subtotalVenta = Number(a.venta?.subtotal || 0)
    let dto: { estado: 'APROBADA' | 'RECHAZADA'; precioAprobado?: number; motivoRespuesta?: string } | null = null
    if (accion === 'aprobar') {
      dto = { estado: 'APROBADA', motivoRespuesta: 'Aprobado' }
    } else if (accion === 'modificar') {
      const { value, isConfirmed } = await Swal.fire({
        title: 'Aprobar con otro precio',
        html: `<p style="font-size:13px;color:#64748b">Subtotal ${bs(subtotalVenta)} · solicitado ${bs(a.precioSolicitado)}</p>`,
        input: 'number',
        inputAttributes: { step: '0.01', min: '0.01', max: String(subtotalVenta) },
        inputValue: String(a.precioSolicitado ?? ''),
        inputValidator: (val) => {
          const n = Number(val)
          return !(n > 0 && n <= subtotalVenta) ? `Ingrese un precio entre 0,01 y ${subtotalVenta.toFixed(2)}` : undefined
        },
        showCancelButton: true,
        confirmButtonText: 'Aprobar este precio',
        cancelButtonText: 'Cancelar',
      })
      if (!isConfirmed) return
      dto = { estado: 'APROBADA', precioAprobado: Number(value), motivoRespuesta: 'Aprobado con precio modificado' }
    } else {
      const { value, isConfirmed } = await Swal.fire({
        title: 'Rechazar descuento',
        text: 'La venta se completará al precio de lista.',
        input: 'text',
        inputPlaceholder: 'Motivo (opcional)',
        showCancelButton: true,
        confirmButtonText: 'Rechazar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#dc2626',
      })
      if (!isConfirmed) return
      dto = { estado: 'RECHAZADA', motivoRespuesta: value?.trim() || 'Descuento no autorizado' }
    }
    setRespondiendo(a.id)
    try {
      await autorizacionesService.responder(a.id, dto)
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: dto.estado === 'APROBADA' ? 'Descuento aprobado' : 'Descuento rechazado', showConfirmButton: false, timer: 2500 })
      loadAutorizaciones()
      loadVentas()
    } catch (err: any) {
      Swal.fire('Error', err?.response?.data?.message || 'No se pudo responder la solicitud', 'error')
      loadAutorizaciones()
    } finally {
      setRespondiendo(null)
    }
  }

  const completadasList = ventas.filter((v) => v.estado === 'COMPLETADA')
  const ingresos = completadasList.reduce((sum, v) => sum + Number(v.total), 0)
  const porAutorizar = ventas.filter((v) => v.estado === 'PENDIENTE').length
  const ventasFiltradas = useMemo(() => ventas.filter((v) => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return true
    const cli = v.cliente ? `${v.cliente.nombre} ${v.cliente.apellido}`.toLowerCase() : ''
    return v.codigoComprobante?.toLowerCase().includes(q) || cli.includes(q)
  }), [ventas, busqueda])

  const tabla = useTabla(ventasFiltradas, valorVenta, 10)

  const statCard = (label: string, value: React.ReactNode, color: string, bg: string, icon: string) => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
        <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center`}>
          <svg className={`w-5 h-5 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
      </div>
    </div>
  )

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
        {statCard('Total Ventas', ventas.length, 'text-slate-800', 'bg-blue-50', 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2')}
        {statCard('Completadas', completadasList.length, 'text-green-600', 'bg-green-50', 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z')}
        {statCard('Ingresos (completadas)', <span className="font-mono">{bs(ingresos)}</span>, 'text-slate-800', 'bg-emerald-50', 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z')}
      </div>

      {esAdmin && (
        <div className="flex gap-2 mb-4" role="tablist">
          {(['ventas', 'autorizaciones'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === t ? 'bg-blue-600 text-white shadow-sm shadow-blue-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {t === 'ventas' ? 'Ventas' : 'Autorizaciones de descuento'}
              {t === 'autorizaciones' && pendientes.length > 0 && (
                <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center ${tab === t ? 'bg-white text-blue-600' : 'bg-red-500 text-white'}`}>{pendientes.length}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {tab === 'autorizaciones' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Solicitudes pendientes</h3>
                <p className="text-sm text-slate-400 mt-0.5">Llegan en tiempo real. La venta se completa al aprobar, modificar o rechazar.</p>
              </div>
              <button onClick={loadAutorizaciones} className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Actualizar</button>
            </div>
            {pendientes.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="font-medium">No hay solicitudes de descuento pendientes</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {pendientes.map((a) => {
                  const sub = Number(a.venta?.subtotal || 0)
                  const sol = Number(a.precioSolicitado || 0)
                  const pct = sub > 0 ? ((sub - sol) / sub) * 100 : 0
                  return (
                    <div key={a.id} className="border border-amber-200 bg-amber-50/40 rounded-2xl p-4 animate-slide-up">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-semibold text-slate-800">{a.venta?.codigoComprobante}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {a.solicitante ? `${a.solicitante.nombre} ${a.solicitante.apellido}` : 'Vendedor'} · {new Date(a.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                            {a.venta?.cliente ? ` · ${a.venta.cliente.nombre} ${a.venta.cliente.apellido}` : ''}
                          </p>
                        </div>
                        <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">−{pct.toFixed(1)}%</span>
                      </div>
                      <ul className="mt-3 space-y-0.5 text-xs text-slate-600">
                        {a.venta?.detalles?.map((d) => (
                          <li key={d.id} className="flex justify-between gap-2"><span className="truncate">{d.cantidad} × {d.producto?.nombre}</span><span className="font-mono">{bs(d.subtotal)}</span></li>
                        ))}
                      </ul>
                      <div className="mt-3 flex items-end justify-between border-t border-amber-200/70 pt-3">
                        <div className="text-xs text-slate-500">Subtotal <span className="font-mono line-through">{bs(sub)}</span></div>
                        <div className="text-right">
                          <p className="text-[11px] text-slate-500">Precio solicitado</p>
                          <p className="text-xl font-bold text-slate-900 font-mono">{bs(sol)}</p>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-slate-600 bg-white/70 rounded-lg px-2.5 py-1.5"><span className="text-slate-400">Motivo:</span> {a.motivoSolicitud}</p>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <button disabled={respondiendo === a.id} onClick={() => responder(a, 'aprobar')}
                          className="py-2 rounded-xl text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors">Aprobar</button>
                        <button disabled={respondiendo === a.id} onClick={() => responder(a, 'modificar')}
                          className="py-2 rounded-xl text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors">Modificar</button>
                        <button disabled={respondiendo === a.id} onClick={() => responder(a, 'rechazar')}
                          className="py-2 rounded-xl text-sm font-medium bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors">Rechazar</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
            <h3 className="text-base font-bold text-slate-800 mb-4">Últimas respuestas</h3>
            {historial.length === 0 ? (
              <p className="text-sm text-slate-400">Todavía no hay solicitudes respondidas.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 bg-slate-50/80">
                      <th className="py-2.5 px-4 font-semibold text-xs uppercase tracking-wider">Venta</th>
                      <th className="py-2.5 px-4 font-semibold text-xs uppercase tracking-wider">Solicitado</th>
                      <th className="py-2.5 px-4 font-semibold text-xs uppercase tracking-wider">Aprobado</th>
                      <th className="py-2.5 px-4 font-semibold text-xs uppercase tracking-wider">Estado</th>
                      <th className="py-2.5 px-4 font-semibold text-xs uppercase tracking-wider">Respondida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {historial.map((a) => (
                      <tr key={a.id}>
                        <td className="py-2.5 px-4 font-mono text-slate-700">{a.venta?.codigoComprobante}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">{a.precioSolicitado != null ? bs(a.precioSolicitado) : '—'}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-800">{a.precioAprobado != null ? bs(a.precioAprobado) : '—'}</td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.estado === 'APROBADA' ? 'bg-green-50 text-green-600' : a.estado === 'RECHAZADA' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>{a.estado === 'EXPIRADA' ? 'CANCELADA' : a.estado}</span>
                        </td>
                        <td className="py-2.5 px-4 text-xs text-slate-500">{a.respondidaEn ? new Date(a.respondidaEn).toLocaleString('es-BO') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Ventas</h3>
              <p className="text-sm text-slate-400 mt-0.5">
                {ventas.length} venta(s) registrada(s){porAutorizar > 0 ? ` · ${porAutorizar} por autorizar` : ''}
              </p>
            </div>
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium text-sm rounded-xl hover:from-blue-600 hover:to-blue-700 shadow-sm shadow-blue-200 transition-all duration-200 active:scale-95">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Nueva Venta
            </button>
          </div>

          <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por comprobante o cliente..."
            className="w-full mb-4 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />

          {loading ? (
            <div className="flex items-center justify-center py-16 text-blue-600"><IconSpinner className="h-8 w-8" /></div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 bg-slate-50/80">
                    <ThOrdenable label="Comprobante" col="comprobante" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                    <ThOrdenable label="Cliente" col="cliente" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                    <ThOrdenable label="Total" col="total" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                    <ThOrdenable label="Puntos" col="puntos" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                    <ThOrdenable label="Estado" col="estado" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                    <ThOrdenable label="Fecha" col="fecha" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                    <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-right w-16">Ticket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {tabla.visibles.map((v) => (
                    <tr key={v.id} onClick={() => setSelected(v)} className="hover:bg-slate-50/80 transition-colors duration-150 cursor-pointer group">
                      <td className="py-3.5 px-4 font-mono text-sm text-slate-600">{v.codigoComprobante}</td>
                      <td className="py-3.5 px-4">
                        {v.cliente ? <p className="font-medium text-slate-800">{v.cliente.nombre} {v.cliente.apellido}</p> : <span className="text-slate-400 italic">Sin cliente</span>}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800 font-mono">
                        {bs(v.total)}
                        {Number(v.descuento) > 0 && <span className="block text-[11px] font-medium text-red-500">−{bs(v.descuento)}</span>}
                      </td>
                      <td className="py-3.5 px-4"><span className="font-semibold text-slate-700">{v.puntosGenerados}</span><span className="text-xs text-slate-400 ml-1">pts</span></td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${estadoStyle(v.estado)}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${estadoDot(v.estado)}`} />
                          {estadoLabel(v.estado)}
                        </span>
                        {v.tieneDevolucion && <span className="ml-1 text-[11px] text-blue-600">con devolución</span>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-sm">{new Date(v.createdAt).toLocaleDateString('es-BO', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                      <td className="py-3.5 px-4 text-right">
                        {v.estado === 'COMPLETADA' && (
                          <button onClick={(e) => { e.stopPropagation(); setTicketVenta(v); setShowTicket(true) }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all active:scale-95" title="Imprimir ticket">
                            <IconPrint />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {tabla.total === 0 && (
                <div className="text-center py-12">
                  <p className="text-slate-400 font-medium">{busqueda ? 'Sin resultados para tu búsqueda' : 'No hay ventas registradas'}</p>
                  {!busqueda && <button onClick={openCreate} className="mt-3 text-blue-600 text-sm font-medium hover:text-blue-700">Registrar primera venta</button>}
                </div>
              )}
            </div>
          )}
          <Paginador pagina={tabla.pagina} totalPaginas={tabla.totalPaginas} total={tabla.total} desde={tabla.desde} hasta={tabla.hasta} onChange={tabla.setPagina} />
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Detalle de Venta">
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Comprobante</p>
                <p className="font-mono font-medium text-slate-800 mt-1">{selected.codigoComprobante}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Estado</p>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border mt-1 ${estadoStyle(selected.estado)}`}>{estadoLabel(selected.estado)}</span>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Método Pago</p>
                <p className="font-medium text-slate-800 mt-1">{selected.metodoPago}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Registrada por</p>
                <p className="font-medium text-slate-800 mt-1">{selected.usuario ? `${selected.usuario.nombre} ${selected.usuario.apellido}` : '—'}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Cliente</p>
              <p className="font-medium text-slate-800 mt-1">{selected.cliente ? `${selected.cliente.nombre} ${selected.cliente.apellido}` : 'Sin cliente'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Productos</p>
              <div className="space-y-2">
                {selected.detalles?.map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800">{d.producto?.nombre || 'Producto'}</p>
                      <p className="text-xs text-slate-400">x{d.cantidad} · {bs(d.precioUnitario)} c/u</p>
                    </div>
                    <p className="text-sm font-bold text-slate-800 ml-4">{bs(d.subtotal)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="font-medium text-slate-700">{bs(selected.subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Descuento autorizado</span><span className="font-medium text-red-500">- {bs(selected.descuento)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Impuesto</span><span className="font-medium text-slate-700">{bs(selected.impuesto)}</span></div>
              <div className="flex justify-between text-lg font-bold border-t border-slate-100 pt-2"><span className="text-slate-800">Total</span><span className="text-slate-800">{bs(selected.total)}</span></div>
            </div>
            {selected.autorizacion && (
              <div className="text-sm bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-1">
                <p className="font-medium text-amber-800">Precio negociado: {bs(selected.autorizacion.precioSolicitado)} — {selected.autorizacion.estado === 'EXPIRADA' ? 'CANCELADA' : selected.autorizacion.estado}</p>
                <p className="text-xs text-amber-700">Motivo: {selected.autorizacion.motivoSolicitud}</p>
                {selected.autorizacion.motivoRespuesta && <p className="text-xs text-amber-700">Respuesta: {selected.autorizacion.motivoRespuesta}</p>}
              </div>
            )}
            {selected.estado === 'ANULADA' && selected.motivoAnulacion && (
              <p className="text-sm bg-red-50 text-red-700 rounded-xl p-3">Anulada: {selected.motivoAnulacion}</p>
            )}
            <div className="flex justify-between text-sm bg-blue-50 rounded-xl p-3">
              <span className="text-blue-600 font-medium">Puntos generados</span>
              <span className="text-blue-600 font-bold">{selected.puntosGenerados} pts</span>
            </div>
            {selected.createdAt && (
              <p className="text-xs text-slate-400 text-center">
                Registrada el {new Date(selected.createdAt).toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
            <div className="flex gap-2">
              {selected.estado === 'COMPLETADA' && (
                <button onClick={() => { setTicketVenta(selected); setSelected(null); setShowTicket(true) }}
                  className="flex-1 py-2.5 flex items-center justify-center gap-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white text-sm font-medium rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all">
                  <IconPrint /> Reimprimir Ticket
                </button>
              )}
              {puedeAnular && (selected.estado === 'COMPLETADA' || selected.estado === 'PENDIENTE') && !selected.tieneDevolucion && (
                <button onClick={() => handleAnular(selected)}
                  className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                  {selected.estado === 'PENDIENTE' ? 'Cancelar venta' : 'Anular venta'}
                </button>
              )}
            </div>
            {puedeAnular && selected.tieneDevolucion && selected.estado === 'COMPLETADA' && (
              <p className="text-[11px] text-slate-400 text-center">Esta venta tiene devoluciones registradas, por lo que no puede anularse.</p>
            )}
          </div>
        )}
      </Modal>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nueva Venta" size="xl">
        <div className="grid lg:grid-cols-5 gap-5">
          {/* Catálogo: tocar un producto lo agrega al carrito */}
          <div className="lg:col-span-3 flex flex-col">
            <div className="relative mb-3">
              <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" value={busquedaProd} onChange={(e) => setBusquedaProd(e.target.value)} autoFocus
                placeholder="Buscar producto por nombre o SKU…"
                className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 overflow-y-auto max-h-[56vh] pr-1 content-start">
              {productosDisponibles.map((p) => {
                const enCarrito = items.find((i) => i.productoId === p.id)
                const sinStock = (enCarrito?.cantidad || 0) >= p.stockActual
                return (
                  <button key={p.id} type="button" onClick={() => addProductoToCart(p)} disabled={sinStock}
                    className="relative text-left p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]">
                    {p.rutaImagen && (
                      <img src={p.rutaImagen} alt="" className="w-full h-20 object-cover rounded-lg mb-2 bg-slate-100 ring-1 ring-slate-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    )}
                    <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 min-h-[2.5rem]">{p.nombre}</p>
                    <p className="text-base font-bold text-blue-600 mt-1 font-mono">{bs(p.precioBase)}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Stock: {p.stockActual}</p>
                    {enCarrito && (
                      <span className="absolute top-2 right-2 min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full bg-blue-600 text-white text-[11px] font-bold">{enCarrito.cantidad}</span>
                    )}
                  </button>
                )
              })}
              {productosDisponibles.length === 0 && (
                <div className="col-span-full py-12 text-center text-sm text-slate-400">No se encontraron productos con stock disponible.</div>
              )}
            </div>
          </div>

          {/* Carrito y cobro */}
          <div className="lg:col-span-2">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Comprobante</label>
                  <input type="text" value={codigoComprobante} onChange={(e) => setCodigoComprobante(e.target.value)} maxLength={20}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Método de pago</label>
                  <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none">
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="QR">QR</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                    <option value="TARJETA">Tarjeta</option>
                  </select>
                </div>
              </div>
              <div className="mt-2">
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Cliente <span className="font-normal text-slate-400">(opcional, acumula puntos)</span></label>
                <ClienteBuscador
                  clientes={clientes}
                  value={clienteId}
                  onChange={(id) => setClienteId(id)}
                  onNuevo={() => setNuevoClienteOpen(true)}
                />
              </div>

              {/* Carrito */}
              <div className="mt-3 pt-3 border-t border-slate-200 overflow-y-auto min-h-[130px] max-h-[28vh]">
                {items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-8 text-slate-400">
                    <svg className="w-9 h-9 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    <p className="text-sm">Toca un producto para agregarlo a la venta.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {items.map((item, idx) => {
                      const stock = productos.find((p) => p.id === item.productoId)?.stockActual ?? 9999
                      return (
                        <div key={item.productoId} className="flex items-center gap-2 py-1.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">{item.productoNombre}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{bs(item.precioUnitario)} c/u</p>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <button type="button" aria-label="Quitar uno" onClick={() => setCantidad(idx, item.cantidad - 1)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-base leading-none">−</button>
                            <span className="w-7 text-center text-sm font-semibold text-slate-800">{item.cantidad}</span>
                            <button type="button" aria-label="Agregar uno" onClick={() => setCantidad(idx, item.cantidad + 1)} disabled={item.cantidad >= stock}
                              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 text-base leading-none">+</button>
                          </div>
                          <span className="w-20 text-right text-sm font-semibold text-slate-800 font-mono">{bs(item.cantidad * item.precioUnitario)}</span>
                          <button type="button" onClick={() => removeItem(idx)} title="Quitar" className="p-1 text-slate-300 hover:text-red-500 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Precio negociado */}
              {items.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                    <input type="checkbox" checked={conDescuento} onChange={(e) => setConDescuento(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    Precio negociado {esAdmin ? '(se aplica directamente)' : '(requiere autorización)'}
                  </label>
                  {conDescuento && (
                    <div className="mt-2 grid grid-cols-5 gap-2 animate-slide-down">
                      <input type="number" step="0.01" min="0.01" value={precioNegociado} onChange={(e) => setPrecioNegociado(e.target.value)}
                        placeholder="Total Bs." aria-label="Precio total negociado"
                        className="col-span-2 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                      <input type="text" value={motivoDescuento} onChange={(e) => setMotivoDescuento(e.target.value)} maxLength={500}
                        placeholder="Motivo del descuento" aria-label="Motivo del descuento"
                        className="col-span-3 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                      {precioNegociado !== '' && !(precioNum > 0 && precioNum < subtotal) && (
                        <p className="col-span-5 text-[11px] text-red-500">El precio debe ser mayor a 0 y menor al subtotal ({bs(subtotal)}).</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Totales */}
              <div className="border-t border-slate-200 pt-3 mt-2 space-y-1.5">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Artículos</span><span className="text-slate-700">{items.reduce((s, i) => s + i.cantidad, 0)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="text-slate-700 font-mono">{bs(subtotal)}</span></div>
                {totalMostrar < subtotal && (
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Descuento {esAdmin ? '' : 'solicitado'}</span><span className="text-red-500 font-mono">−{bs(subtotal - totalMostrar)}</span></div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-slate-200"><span className="text-base font-semibold text-slate-800">Total a cobrar</span><span className="text-2xl font-bold text-slate-900 font-mono">{bs(totalMostrar)}</span></div>
              </div>

              <button onClick={handleCreate} disabled={submitting || !codigoComprobante || items.length === 0 || (conDescuento && !descuentoValido)}
                className="mt-3 w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.99] shadow-sm shadow-blue-200">
                {submitting ? (<><IconSpinner /> Registrando…</>) : conDescuento && !esAdmin ? 'Solicitar autorización' : 'Registrar Venta'}
              </button>
              <p className="text-[11px] text-center text-slate-400 mt-2">Precios, impuesto y total se calculan en el servidor con el catálogo vigente.</p>
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={nuevoClienteOpen} onClose={() => setNuevoClienteOpen(false)} title="Nuevo Cliente">
        <form onSubmit={guardarNuevoCliente} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo Doc.</label>
              <select value={nuevoCliente.tipoDocumento} onChange={(e) => setNuevoCliente({ ...nuevoCliente, tipoDocumento: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="CI">C.I. (cédula de identidad)</option>
                <option value="NIT">NIT</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">N° Documento *</label>
              <input value={nuevoCliente.numeroDocumento} onChange={(e) => setNuevoCliente({ ...nuevoCliente, numeroDocumento: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="12345678" required minLength={6} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
              <input value={nuevoCliente.nombre} onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Juan" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Apellido *</label>
              <input value={nuevoCliente.apellido} onChange={(e) => setNuevoCliente({ ...nuevoCliente, apellido: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Pérez" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
              <input value={nuevoCliente.telefono} onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="71234567" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" value={nuevoCliente.email} onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="cliente@ejemplo.com" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setNuevoClienteOpen(false)} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
            <button type="submit" disabled={guardandoCliente} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2">
              {guardandoCliente && (<IconSpinner />)}
              Guardar
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!esperando} onClose={() => setEsperando(null)} title="Esperando autorización" size="sm">
        {esperando && (
          <div className="text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center"><IconSpinner className="h-7 w-7" /></div>
            <div>
              <p className="font-semibold text-slate-800">Solicitud enviada al administrador</p>
              <p className="text-sm text-slate-500 mt-1">Venta <span className="font-mono">{esperando.codigoComprobante}</span> · precio solicitado {bs(esperando.autorizacion?.precioSolicitado)}</p>
            </div>
            <p className="text-xs text-slate-400">La respuesta llega en tiempo real. Puede cerrar esta ventana: la venta queda «por autorizar» en el listado y se completa en cuanto el administrador responda.</p>
            <button onClick={() => setEsperando(null)} className="w-full py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Seguir trabajando</button>
          </div>
        )}
      </Modal>

      {showTicket && ticketVenta && <TicketPrint venta={ticketVenta} onClose={() => setShowTicket(false)} />}
    </div>
  )
}
