import api from './api'
import { FidelizacionHistorial, Cliente } from '../types'

export const fidelizacionService = {
  async getHistorial(clienteId: string): Promise<FidelizacionHistorial[]> {
    const { data } = await api.get(`/fidelizacion/historial/${clienteId}`)
    return data
  },
  async getResumen(clienteId: string): Promise<{ cliente: Cliente; totalPuntos: number; nivel: string }> {
    const { data } = await api.get(`/fidelizacion/resumen/${clienteId}`)
    return data
  },
}
