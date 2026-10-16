import api from './api'
import { Devolucion } from '../types'

export const devolucionesService = {
  async getAll(): Promise<Devolucion[]> {
    const { data } = await api.get('/devoluciones')
    return data
  },
  async getById(id: string): Promise<Devolucion> {
    const { data } = await api.get(`/devoluciones/${id}`)
    return data
  },
  async create(dto: { ventaId: string; codigo: string; motivo: string; detalles: { productoId: string; cantidad: number; precioUnitario: number }[] }): Promise<Devolucion> {
    const { data } = await api.post('/devoluciones', dto)
    return data
  },
}
