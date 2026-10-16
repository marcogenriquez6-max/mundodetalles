export enum EstadoVenta {
  PENDIENTE = 'PENDIENTE',
  COMPLETADA = 'COMPLETADA',
  ANULADA = 'ANULADA',
  REEMBOLSADA = 'REEMBOLSADA',
}

export enum TipoComprobante {
  NOTA_VENTA = 'NOTA_VENTA', // comprobante interno, sin derecho a crédito fiscal
  FACTURA = 'FACTURA', // reservado: facturación electrónica del SIN (SIAT)
  NOTA_CREDITO_DEBITO = 'NOTA_CREDITO_DEBITO',
}

export enum NivelFidelizacion {
  BRONCE = 'BRONCE',
  PLATA = 'PLATA',
  ORO = 'ORO',
  PLATINO = 'PLATINO',
}

export enum EstadoAutorizacion {
  PENDIENTE = 'PENDIENTE',
  APROBADA = 'APROBADA',
  RECHAZADA = 'RECHAZADA',
  EXPIRADA = 'EXPIRADA',
}

export enum TipoAutorizacion {
  DESCUENTO_ESPECIAL = 'DESCUENTO_ESPECIAL',
  PRECIO_ESPECIAL = 'PRECIO_ESPECIAL',
  CREDITO = 'CREDITO',
  ANULACION = 'ANULACION',
}

export enum TipoOperacionFidelizacion {
  ACUMULACION = 'ACUMULACION',
  REDENCION = 'REDENCION',
  CADUCIDAD = 'CADUCIDAD',
  AJUSTE = 'AJUSTE',
}

export enum TipoPrecio {
  BASE = 'BASE',
  MAYORISTA = 'MAYORISTA',
  ESPECIAL = 'ESPECIAL',
}

export enum OperacionAuditoria {
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  SOFT_DELETE = 'SOFT_DELETE',
  RESTORE = 'RESTORE',
}

export enum EstadoCaja {
  ABIERTA = 'ABIERTA',
  CERRADA = 'CERRADA',
}

export enum TipoMovimiento {
  ENTRADA = 'ENTRADA',
  SALIDA = 'SALIDA',
  AJUSTE = 'AJUSTE',
}

export enum MetodoPago {
  EFECTIVO = 'EFECTIVO',
  QR = 'QR',
  TRANSFERENCIA = 'TRANSFERENCIA',
  TARJETA = 'TARJETA',
}

export enum TipoDocumento {
  CI = 'CI', // cédula de identidad
  NIT = 'NIT', // número de identificación tributaria
}

export enum EstadoDevolucion {
  COMPLETADA = 'COMPLETADA',
  PENDIENTE = 'PENDIENTE',
  ANULADA = 'ANULADA',
}

export enum EstadoCotizacion {
  PENDIENTE = 'PENDIENTE',
  APROBADA = 'APROBADA',
  RECHAZADA = 'RECHAZADA',
  VENCIDA = 'VENCIDA',
}
