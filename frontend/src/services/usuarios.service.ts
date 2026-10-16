import api from './api'
import { Usuario } from '../types'

export const usuariosService = {
  async getAll(): Promise<Usuario[]> {
    const { data } = await api.get('/usuarios')
    return data
  },
  async getById(id: string): Promise<Usuario> {
    const { data } = await api.get(`/usuarios/${id}`)
    return data
  },
  async create(dto: any): Promise<Usuario> {
    const { data } = await api.post('/usuarios', dto)
    return data
  },
  async update(id: string, dto: any): Promise<Usuario> {
    const { data } = await api.patch(`/usuarios/${id}`, dto)
    return data
  },
  async delete(id: string): Promise<Usuario> {
    const { data } = await api.delete(`/usuarios/${id}`)
    return data
  },
}
