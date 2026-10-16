import api from './api'
import { Caja } from '../types'

export const cajaService = {
  async getAll(): Promise<Caja[]> {
    const { data } = await api.get('/caja')
    return data
  },
  async getById(id: string): Promise<Caja> {
    const { data } = await api.get(`/caja/${id}`)
    return data
  },
  async abrir(montoInicial: number, observaciones?: string): Promise<Caja> {
    const { data } = await api.post('/caja/abrir', { montoInicial, observaciones })
    return data
  },
  async cerrar(id: string, montoFinal: number, observaciones?: string): Promise<Caja> {
    const { data } = await api.post(`/caja/${id}/cerrar`, { montoFinal, observaciones })
    return data
  },
  async findAbierta(): Promise<Caja | null> {
    const { data } = await api.get('/caja/abierta')
    return data || null
  },
}
