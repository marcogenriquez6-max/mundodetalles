import api from './api'
import { Producto } from '../types'

export const productosService = {
  async getAll(): Promise<Producto[]> {
    const { data } = await api.get('/productos')
    return data
  },
  async getById(id: string): Promise<Producto> {
    const { data } = await api.get(`/productos/${id}`)
    return data
  },
  async create(dto: Partial<Producto>): Promise<Producto> {
    const { data } = await api.post('/productos', dto)
    return data
  },
  async update(id: string, dto: Partial<Producto>): Promise<Producto> {
    const { data } = await api.patch(`/productos/${id}`, dto)
    return data
  },
  async delete(id: string): Promise<Producto> {
    const { data } = await api.delete(`/productos/${id}`)
    return data
  },
  async stockBajo(): Promise<Producto[]> {
    const { data } = await api.get('/productos/stock-bajo')
    return data
  },
}
