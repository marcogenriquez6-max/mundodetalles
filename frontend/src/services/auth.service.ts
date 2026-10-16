import api from './api'
import { AuthResponse } from '../types'

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('usuario', JSON.stringify(data.usuario))
    return data
  },

  logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    window.location.href = '/login'
  },

  getUsuario() {
    const stored = localStorage.getItem('usuario')
    return stored ? JSON.parse(stored) : null
  },

  isAuthenticated() {
    return !!localStorage.getItem('token')
  },
}
