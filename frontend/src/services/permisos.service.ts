import api from './api'
import { Permiso } from '../types'

export const permisosService = {
  async getAll(): Promise<Permiso[]> {
    const { data } = await api.get('/permisos')
    return data
  },
  async getById(id: string): Promise<Permiso> {
    const { data } = await api.get(`/permisos/${id}`)
    return data
  },
  async create(dto: Partial<Permiso>): Promise<Permiso> {
    const { data } = await api.post('/permisos', dto)
    return data
  },
  async update(id: string, dto: Partial<Permiso>): Promise<Permiso> {
    const { data } = await api.patch(`/permisos/${id}`, dto)
    return data
  },
  async delete(id: string): Promise<Permiso> {
    const { data } = await api.delete(`/permisos/${id}`)
    return data
  },
}
