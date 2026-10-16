import { useState, useEffect } from 'react'
import { clientesService } from '../services/clientes.service'
import api from '../services/api'
import { Cliente } from '../types'
import ClienteBuscador from '../components/ClienteBuscador'

const nivelGradiente = (nivel?: string) => {
  const map: Record<string, string> = {
    BRONCE: 'from-amber-700 to-amber-800',
    PLATA: 'from-slate-400 to-slate-500',
    ORO: 'from-yellow-400 to-yellow-500',
    PLATINO: 'from-blue-400 to-blue-600',
    VIP: 'from-purple-500 to-purple-700',
  }
  return map[nivel || ''] || 'from-slate-400 to-slate-500'
}

const nivelIcono = (nivel?: string) => {
  const map: Record<string, string> = {
    BRONCE: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    PLATA: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    ORO: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
    PLATINO: 'M13 10V3L4 14h7v7l9-11h-7z',
    VIP: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  }
  return map[nivel || ''] || map.BRONCE
}

export default function Fidelizacion() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteId, setClienteId] = useState('')
  const [resumen, setResumen] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [loadingClientes, setLoadingClientes] = useState(true)

  useEffect(() => {
    clientesService.getAll().then(setClientes).catch(() => {}).finally(() => setLoadingClientes(false))
  }, [])

  const buscarResumen = async () => {
    if (!clienteId) return
    setLoading(true)
    setResumen(null)
    try {
      const { data } = await api.get(`/fidelizacion/resumen/${clienteId}`)
      setResumen(data)
    } catch {
      setResumen(null)
    } finally {
      setLoading(false)
    }
  }

  const clienteSel = clientes.find(c => c.id === clienteId)
  const nivel = clienteSel?.nivelFidelizacion || resumen?.cliente?.nivelFidelizacion

  return (
    <div className="animate-fade-in space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Fidelización de Clientes</h3>
            <p className="text-sm text-slate-400">Consulta el programa de puntos y niveles</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 min-w-0">
            <ClienteBuscador
              clientes={clientes}
              value={clienteId}
              onChange={(id) => { setClienteId(id); setResumen(null) }}
              placeholder="Buscar cliente por nombre o documento…"
              inputClassName="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <button
            onClick={buscarResumen}
            disabled={loading || !clienteId || loadingClientes}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-yellow-600 disabled:opacity-50 transition-all text-sm shadow-sm shadow-amber-200 active:scale-95"
          >
            {loading ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            )}
            Consultar
          </button>
        </div>
      </div>

      {resumen && (
        <div className="animate-fade-in">
          <div className={`bg-gradient-to-r ${nivelGradiente(nivel)} rounded-2xl p-6 text-white shadow-lg relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg">
                  {resumen.cliente.nombre?.charAt(0)}{resumen.cliente.apellido?.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{resumen.cliente.nombre} {resumen.cliente.apellido}</h3>
                  <p className="text-white/70 text-sm">{resumen.cliente.tipoDocumento} {resumen.cliente.numeroDocumento}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">{resumen.cliente.puntosActuales}</p>
                  <p className="text-white/70 text-xs">puntos</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={nivelIcono(nivel)} />
                </svg>
                <span className="font-semibold tracking-wide text-sm">{nivel}</span>
                {resumen.progreso?.siguienteNivel && (
                  <>
                    <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span className="text-white/70 text-sm">{resumen.progreso.siguienteNivel}</span>
                    <span className="text-white/50 text-xs ml-1">({resumen.progreso.puntosFaltantes} pts faltan)</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 text-center animate-slide-up" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-blue-600">{resumen.resumen.totalAcumulado}</p>
              <p className="text-xs text-slate-400 mt-1 font-medium">Puntos Acumulados</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 text-center animate-slide-up" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-green-600">{resumen.resumen.cantidadOperaciones}</p>
              <p className="text-xs text-slate-400 mt-1 font-medium">Operaciones</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 text-center animate-slide-up" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-red-600">{resumen.resumen.totalRedimido}</p>
              <p className="text-xs text-slate-400 mt-1 font-medium">Puntos Redimidos</p>
            </div>
          </div>
        </div>
      )}

      {!resumen && !loading && clienteId && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
          <svg className="w-16 h-16 text-slate-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-slate-400 font-medium">Presiona "Consultar" para ver la información</p>
        </div>
      )}
    </div>
  )
}
