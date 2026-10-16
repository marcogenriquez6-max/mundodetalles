import api from './api'
import { Venta } from '../types'

export const ventasService = {
  async getAll(): Promise<Venta[]> {
    const { data } = await api.get('/ventas')
    return data
  },
  async getById(id: string): Promise<Venta> {
    const { data } = await api.get(`/ventas/${id}`)
    return data
  },
  async create(dto: any): Promise<Venta> {
    const { data } = await api.post('/ventas', dto)
    return data
  },
  async anular(id: string, motivo: string): Promise<Venta> {
    const { data } = await api.patch(`/ventas/${id}/anular`, { motivo })
    return data
  },
}
