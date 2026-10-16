import api from './api'
import { Rol } from '../types'

export const rolesService = {
  async getAll(): Promise<Rol[]> {
    const { data } = await api.get('/roles')
    return data
  },
  async getById(id: string): Promise<Rol> {
    const { data } = await api.get(`/roles/${id}`)
    return data
  },
  async create(dto: Partial<Rol>): Promise<Rol> {
    const { data } = await api.post('/roles', dto)
    return data
  },
  async update(id: string, dto: Partial<Rol>): Promise<Rol> {
    const { data } = await api.patch(`/roles/${id}`, dto)
    return data
  },
  async delete(id: string): Promise<Rol> {
    const { data } = await api.delete(`/roles/${id}`)
    return data
  },
}
