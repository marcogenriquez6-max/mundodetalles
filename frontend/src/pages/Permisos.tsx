import { useEffect, useMemo, useState } from 'react'
import { permisosService } from '../services/permisos.service'
import { Permiso } from '../types'
import Swal from 'sweetalert2'

export default function Permisos() {
  const [permisos, setPermisos] = useState<Permiso[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [ordenKey, setOrdenKey] = useState<'codigo' | 'nombre'>('codigo')

  const filtered = useMemo(() => permisos.filter(p =>
    p.codigo.toLowerCase().includes(search.toLowerCase()) ||
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    p.modulo.toLowerCase().includes(search.toLowerCase())
  ), [permisos, search])

  const porModulo = useMemo(() => {
    const ordenados = [...filtered].sort((a, b) =>
      String(a[ordenKey]).localeCompare(String(b[ordenKey]), 'es', { sensitivity: 'base' }),
    )
    return ordenados.reduce<Record<string, Permiso[]>>((acc, p) => {
      ;(acc[p.modulo] ||= []).push(p)
      return acc
    }, {})
  }, [filtered, ordenKey])

  useEffect(() => {
    permisosService.getAll()
      .then(setPermisos)
      .catch(() => Swal.fire('Error', 'No se pudieron cargar los permisos', 'error'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Permisos</h3>
            <p className="text-sm text-slate-400 mt-0.5">{permisos.length} permiso(s) agrupados por módulo.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar permiso por código, nombre o módulo..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
          </div>
          <select value={ordenKey} onChange={e => setOrdenKey(e.target.value as 'codigo' | 'nombre')}
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all">
            <option value="codigo">Ordenar por código</option>
            <option value="nombre">Ordenar por nombre</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(porModulo).map(([modulo, items]) => (
              <div key={modulo}>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{modulo}</h4>
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 bg-slate-50/80">
                        <th className="py-2.5 px-4 font-semibold text-xs uppercase tracking-wider">Código</th>
                        <th className="py-2.5 px-4 font-semibold text-xs uppercase tracking-wider">Nombre</th>
                        <th className="py-2.5 px-4 font-semibold text-xs uppercase tracking-wider">Descripción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {items.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-4 font-mono text-xs text-blue-600">{p.codigo}</td>
                          <td className="py-2.5 px-4 font-medium text-slate-800">{p.nombre}</td>
                          <td className="py-2.5 px-4 text-slate-500">{p.descripcion || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-center py-12 text-slate-400">Sin resultados</p>}
          </div>
        )}
      </div>
    </div>
  )
}
