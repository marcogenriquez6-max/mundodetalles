import { useEffect, useState } from 'react'
import { rolesService } from '../services/roles.service'
import { Rol } from '../types'
import Swal from 'sweetalert2'

export default function Roles() {
  const [roles, setRoles] = useState<Rol[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const filtered = roles.filter(r =>
    r.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (r.descripcion && r.descripcion.toLowerCase().includes(search.toLowerCase()))
  )

  useEffect(() => {
    rolesService.getAll()
      .then(setRoles)
      .catch(() => Swal.fire('Error', 'No se pudieron cargar los roles', 'error'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="animate-fade-in space-y-5">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Roles del sistema</h3>
            <p className="text-sm text-slate-400 mt-0.5">{roles.length} rol(es). Definen los permisos y la jerarquía de autorización.</p>
          </div>
        </div>

        <div className="relative mb-4">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar rol..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => (
              <div key={r.id} className="border border-slate-100 rounded-xl p-4 hover:border-blue-200 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{r.nombre}</p>
                      <p className="text-xs text-slate-400">{r.descripcion || 'Sin descripción'}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">{r.permisos?.length || 0} permisos</span>
                </div>
                {r.permisos && r.permisos.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pl-13">
                    {r.permisos.map(p => (
                      <span key={p.id} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-xs font-mono">{p.codigo}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && <p className="text-center py-12 text-slate-400">Sin resultados</p>}
          </div>
        )}
      </div>
    </div>
  )
}
