import api from './api'
import { Cliente } from '../types'

export const clientesService = {
  async getAll(): Promise<Cliente[]> {
    const { data } = await api.get('/clientes')
    return data
  },
  async getById(id: string): Promise<Cliente> {
    const { data } = await api.get(`/clientes/${id}`)
    return data
  },
  async create(dto: Partial<Cliente>): Promise<Cliente> {
    const { data } = await api.post('/clientes', dto)
    return data
  },
  async update(id: string, dto: Partial<Cliente>): Promise<Cliente> {
    const { data } = await api.patch(`/clientes/${id}`, dto)
    return data
  },
  async delete(id: string): Promise<Cliente> {
    const { data } = await api.delete(`/clientes/${id}`)
    return data
  },
}
