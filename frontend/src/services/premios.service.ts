import api from './api'
import { Premio } from '../types'

export const premiosService = {
  async getAll(disponibles = false): Promise<Premio[]> {
    const { data } = await api.get('/premios', { params: disponibles ? { disponibles: 'true' } : {} })
    return data
  },
  async create(dto: Partial<Premio>): Promise<Premio> {
    const { data } = await api.post('/premios', dto)
    return data
  },
  async update(id: string, dto: Partial<Premio>): Promise<Premio> {
    const { data } = await api.patch(`/premios/${id}`, dto)
    return data
  },
  async delete(id: string): Promise<Premio> {
    const { data } = await api.delete(`/premios/${id}`)
    return data
  },
  async canjear(id: string, clienteId: string) {
    const { data } = await api.post(`/premios/${id}/canjear`, { clienteId })
    return data
  },
}
