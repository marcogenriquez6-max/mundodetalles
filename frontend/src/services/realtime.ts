import { io, Socket } from 'socket.io-client'

/**
 * Conexión única en tiempo real (Socket.IO / WebSocket) con el backend.
 * Pasa por el mismo origen que la API: Vite (desarrollo) y Nginx (Docker)
 * redirigen la ruta /socket.io/ al servidor NestJS.
 */
let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io({ path: '/socket.io', transports: ['websocket', 'polling'], reconnection: true })
  }
  return socket
}

export interface AutorizacionPendienteEvt {
  autorizacionId: string
  ventaId: string
  codigoComprobante: string
  subtotal: number
  precioSolicitado: number | null
  motivo: string
  solicitante?: string
}

export interface AutorizacionRespondidaEvt {
  autorizacionId: string
  ventaId: string
  estado: 'APROBADA' | 'RECHAZADA' | 'EXPIRADA'
  precioAprobado?: number | null
  motivoRespuesta?: string | null
}
