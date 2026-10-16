import api from './api'
import { KardexMovimiento } from '../types'

export const kardexService = {
  async getAll(filters?: { productoId?: string; tipoMovimiento?: string; fechaInicio?: string; fechaFin?: string }): Promise<KardexMovimiento[]> {
    const params = new URLSearchParams()
    if (filters?.productoId) params.append('productoId', filters.productoId)
    if (filters?.tipoMovimiento) params.append('tipoMovimiento', filters.tipoMovimiento)
    if (filters?.fechaInicio) params.append('fechaInicio', filters.fechaInicio)
    if (filters?.fechaFin) params.append('fechaFin', filters.fechaFin)
    const { data } = await api.get('/kardex', { params })
    return data
  },
  async getById(id: string): Promise<KardexMovimiento> {
    const { data } = await api.get(`/kardex/${id}`)
    return data
  },
  async obtenerPorProducto(productoId: string): Promise<KardexMovimiento[]> {
    const { data } = await api.get(`/kardex/producto/${productoId}`)
    return data
  },
}
