import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/auth.service'
import Swal from 'sweetalert2'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authService.login(email, password)
      navigate('/')
    } catch (error: any) {
      Swal.fire('Error', error.response?.data?.message || 'Credenciales inválidas', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className={`absolute -top-40 -left-40 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`} />
        <div className={`absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[120px] transition-all duration-1000 delay-300 ${mounted ? 'opacity-100' : 'opacity-0'}`} />
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[150px] transition-all duration-1000 delay-500 ${mounted ? 'opacity-100' : 'opacity-0'}`} />
      </div>

      <div className={`relative w-full max-w-md transition-all duration-700 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30 ring-4 ring-white/10">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Mundo Detalles</h1>
            <p className="text-blue-200/70 mt-2 text-sm font-medium">Sistema de Gestión Integral</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="transition-all duration-300 hover:-translate-y-0.5">
              <label className="block text-sm font-medium text-blue-200/80 mb-2">Correo Electrónico</label>
              <div className="relative group">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300/60 group-focus-within:text-blue-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/30 transition-all group-hover:border-white/20"
                  placeholder="admin@mundodetalles.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="transition-all duration-300 hover:-translate-y-0.5">
              <label className="block text-sm font-medium text-blue-200/80 mb-2">Contraseña</label>
              <div className="relative group">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300/60 group-focus-within:text-blue-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/30 transition-all group-hover:border-white/20"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25 active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Ingresando...
                </span>
              ) : 'Ingresar al Sistema'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-blue-300/40 text-xs leading-relaxed tracking-wider">
              UNIVERSIDAD PRIVADA DE ORURO<br />
              INGENIERÍA DE SISTEMAS
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
