import api from './api'
import { Categoria } from '../types'

export const categoriasService = {
  async getAll(): Promise<Categoria[]> {
    const { data } = await api.get('/categorias')
    return data
  },
  async getById(id: string): Promise<Categoria> {
    const { data } = await api.get(`/categorias/${id}`)
    return data
  },
  async create(dto: Partial<Categoria>): Promise<Categoria> {
    const { data } = await api.post('/categorias', dto)
    return data
  },
  async update(id: string, dto: Partial<Categoria>): Promise<Categoria> {
    const { data } = await api.patch(`/categorias/${id}`, dto)
    return data
  },
  async delete(id: string): Promise<Categoria> {
    const { data } = await api.delete(`/categorias/${id}`)
    return data
  },
}
