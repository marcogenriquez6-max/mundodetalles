import api from './api'
import { Proveedor } from '../types'

export const proveedoresService = {
  async getAll(): Promise<Proveedor[]> {
    const { data } = await api.get('/proveedores')
    return data
  },
  async getById(id: string): Promise<Proveedor> {
    const { data } = await api.get(`/proveedores/${id}`)
    return data
  },
  async create(dto: Partial<Proveedor>): Promise<Proveedor> {
    const { data } = await api.post('/proveedores', dto)
    return data
  },
  async update(id: string, dto: Partial<Proveedor>): Promise<Proveedor> {
    const { data } = await api.patch(`/proveedores/${id}`, dto)
    return data
  },
  async delete(id: string): Promise<void> {
    await api.delete(`/proveedores/${id}`)
  },
}
