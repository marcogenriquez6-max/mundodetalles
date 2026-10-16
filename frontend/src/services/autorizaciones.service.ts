import api from './api'
import { Autorizacion } from '../types'

export const autorizacionesService = {
  async getAll(): Promise<Autorizacion[]> {
    const { data } = await api.get('/autorizaciones')
    return data
  },
  async getById(id: string): Promise<Autorizacion> {
    const { data } = await api.get(`/autorizaciones/${id}`)
    return data
  },
  async getPendientes(): Promise<Autorizacion[]> {
    const { data } = await api.get('/autorizaciones/pendientes')
    return data
  },
  async solicitar(dto: { detalleVentaId?: string; ventaId: string; tipo: string; precioSolicitado?: number; motivoSolicitud: string }): Promise<Autorizacion> {
    const { data } = await api.post('/autorizaciones/solicitar', dto)
    return data
  },
  async responder(id: string, dto: { estado: 'APROBADA' | 'RECHAZADA'; precioAprobado?: number; motivoRespuesta?: string }): Promise<Autorizacion> {
    const { data } = await api.post('/autorizaciones/responder', { autorizacionId: id, ...dto })
    return data
  },
}
