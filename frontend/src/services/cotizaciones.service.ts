import api from './api'
import { Cotizacion } from '../types'

export const cotizacionesService = {
  async getAll(): Promise<Cotizacion[]> {
    const { data } = await api.get('/cotizaciones')
    return data
  },
  async getById(id: string): Promise<Cotizacion> {
    const { data } = await api.get(`/cotizaciones/${id}`)
    return data
  },
  async create(dto: { codigo: string; clienteId?: string; fechaValidez?: string; observaciones?: string; detalles: { productoId: string; cantidad: number; precioUnitario: number }[] }): Promise<Cotizacion> {
    const { data } = await api.post('/cotizaciones', dto)
    return data
  },
  async update(id: string, dto: Partial<Cotizacion>): Promise<Cotizacion> {
    const { data } = await api.patch(`/cotizaciones/${id}`, dto)
    return data
  },
  async delete(id: string): Promise<void> {
    await api.delete(`/cotizaciones/${id}`)
  },
}
