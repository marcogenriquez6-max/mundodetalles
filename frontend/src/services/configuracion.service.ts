import api from './api'
import { Configuracion } from '../types'

export const configuracionService = {
  async getAll(): Promise<Configuracion[]> {
    const { data } = await api.get('/configuracion')
    return data
  },
  async get(clave: string): Promise<Configuracion> {
    const { data } = await api.get(`/configuracion/${clave}`)
    return data
  },
  async set(dto: { clave: string; valor: string; tipo?: string; descripcion?: string }): Promise<Configuracion> {
    const { data } = await api.post('/configuracion', dto)
    return data
  },
  async delete(clave: string): Promise<void> {
    await api.delete(`/configuracion/${clave}`)
  },
}
