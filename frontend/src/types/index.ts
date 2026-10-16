export interface Usuario {
  id: string
  email: string
  username: string
  nombre: string
  apellido: string
  telefono?: string
  rolId: string
  rol?: Rol
  esActivo: boolean
}

export interface Rol {
  id: string
  nombre: string
  descripcion?: string
  permisos?: Permiso[]
}

export interface Permiso {
  id: string
  codigo: string
  nombre: string
  modulo: string
  descripcion?: string
}

export interface Categoria {
  id: string
  nombre: string
  descripcion?: string
  padreId?: string
  padre?: Categoria
}

export interface Producto {
  id: string
  sku: string
  codigoBarras?: string
  nombre: string
  descripcion?: string
  categoriaId: string
  categoria?: Categoria
  precioBase: number
  precioMayorista?: number
  stockActual: number
  stockMinimo: number
  stockMaximo: number
  costoPromedio?: number
  unidadMedida: string
  rutaImagen?: string
  esActivo: boolean
  otorgaPuntos?: boolean
}

export interface Cliente {
  id: string
  tipoDocumento: string
  numeroDocumento: string
  nombre: string
  apellido: string
  email?: string
  telefono?: string
  direccion?: string
  puntosAcumulados: number
  nivelFidelizacion: string
}

export interface Venta {
  id: string
  codigoComprobante: string
  tipoComprobante: string
  cliente?: Cliente
  clienteId?: string
  usuario: Usuario
  subtotal: number
  descuento: number
  impuesto: number
  total: number
  puntosGenerados: number
  puntosRedimidos: number
  metodoPago: string
  estado: string
  motivoAnulacion?: string
  tieneDevolucion?: boolean
  autorizacionId?: string
  autorizacion?: Autorizacion
  detalles: DetalleVenta[]
  createdAt: string
}

export interface DetalleVenta {
  id: string
  productoId: string
  producto: Producto
  cantidad: number
  precioUnitario: number
  descuentoAplicado: number
  subtotal: number
}

export interface AuthResponse {
  access_token: string
  usuario: {
    id: string
    email: string
    nombre: string
    apellido: string
    rol: string
  }
}

export interface Proveedor {
  id: string
  nombre: string
  contacto?: string
  telefono?: string
  email?: string
  direccion?: string
  nit?: string
  esActivo: boolean
}

export interface KardexMovimiento {
  id: string
  productoId: string
  producto?: Producto
  tipoMovimiento: 'ENTRADA' | 'SALIDA' | 'AJUSTE'
  cantidad: number
  costoUnitario?: number
  stockAnterior: number
  stockNuevo: number
  referencia?: string
  referenciaId?: string
  observacion?: string
  usuario?: Usuario
  createdAt: string
}

export interface Devolucion {
  id: string
  ventaId: string
  venta?: Venta
  codigo: string
  motivo: string
  subtotal: number
  impuesto: number
  total: number
  estado: string
  usuario?: Usuario
  detalles?: DetalleDevolucion[]
  createdAt: string
}

export interface DetalleDevolucion {
  id: string
  devolucionId?: string
  productoId: string
  producto?: Producto
  cantidad: number
  precioUnitario: number
  subtotal: number
}

export interface Caja {
  id: string
  fechaApertura: string
  fechaCierre?: string
  montoInicial: number
  montoFinal?: number
  totalIngresos: number
  totalEgresos: number
  ventasOtrosMedios?: number
  cantidadVentas?: number
  saldoEsperado?: number
  diferencia?: number | null
  estado: 'ABIERTA' | 'CERRADA'
  usuarioApertura?: Usuario
  usuarioCierre?: Usuario
  observaciones?: string
}

export interface Cotizacion {
  id: string
  codigo: string
  clienteId?: string
  cliente?: Cliente
  fechaValidez?: string
  subtotal: number
  impuesto: number
  descuento: number
  total: number
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'VENCIDA'
  observaciones?: string
  usuario?: Usuario
  detalles?: DetalleCotizacion[]
  createdAt: string
}

export interface DetalleCotizacion {
  id: string
  cotizacionId?: string
  productoId: string
  producto?: Producto
  cantidad: number
  precioUnitario: number
  subtotal: number
}

export interface Reporte {
  id: string
  nombre: string
  descripcion?: string
  tipo: 'VENTAS_DIA' | 'VENTAS_MES' | 'RANKING_CLIENTES' | 'INVENTARIO' | 'PERSONALIZADO'
  filtros?: Record<string, unknown>
  columnas?: string[]
  esPublico: boolean
  usuarioId?: string
  usuario?: Usuario
  createdAt: string
}

export interface Autorizacion {
  id: string
  detalleVentaId?: string
  ventaId: string
  solicitanteId: string
  solicitante?: Usuario
  aprobadorId?: string
  aprobador?: Usuario
  tipo: 'DESCUENTO_ESPECIAL' | 'PRECIO_ESPECIAL' | 'CREDITO' | 'ANULACION'
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'EXPIRADA'
  precioSolicitado?: number
  precioAprobado?: number
  motivoSolicitud: string
  motivoRespuesta?: string
  expiraEn: string
  respondidaEn?: string
  venta?: Venta
  createdAt: string
}

export interface FidelizacionHistorial {
  id: string
  clienteId: string
  ventaId?: string
  tipoOperacion: 'ACUMULACION' | 'REDENCION' | 'CADUCIDAD' | 'AJUSTE'
  puntos: number
  saldoAnterior: number
  saldoPosterior: number
  descripcion?: string
  createdBy: string
  createdAt: string
}

export interface Configuracion {
  id: string
  clave: string
  valor: string
  tipo: string
  descripcion?: string
  esSistema: boolean
}

export interface Premio {
  id: string
  nombre: string
  descripcion?: string
  puntosRequeridos: number
  stock: number
  esActivo: boolean
  createdAt?: string
}
