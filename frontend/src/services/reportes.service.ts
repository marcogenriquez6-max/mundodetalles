import api from './api'
import { Reporte } from '../types'

export const reportesService = {
  async getAll(): Promise<Reporte[]> {
    const { data } = await api.get('/reportes')
    return data
  },
  async getById(id: string): Promise<Reporte> {
    const { data } = await api.get(`/reportes/${id}`)
    return data
  },
  async create(dto: Partial<Reporte>): Promise<Reporte> {
    const { data } = await api.post('/reportes', dto)
    return data
  },
  async update(id: string, dto: Partial<Reporte>): Promise<Reporte> {
    const { data } = await api.patch(`/reportes/${id}`, dto)
    return data
  },
  async delete(id: string): Promise<Reporte> {
    const { data } = await api.delete(`/reportes/${id}`)
    return data
  },
}
