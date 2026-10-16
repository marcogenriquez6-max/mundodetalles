import { useEffect, useState } from 'react'
import { configuracionService } from '../services/configuracion.service'
import type { Configuracion as ConfiguracionType } from '../types'
import Swal from 'sweetalert2'
import Modal from '../components/Modal'

const tipoOptions = ['string', 'number', 'boolean', 'json']

export default function Configuracion() {
  const [items, setItems] = useState<ConfiguracionType[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editClave, setEditClave] = useState<string | null>(null)
  const [clave, setClave] = useState('')
  const [valor, setValor] = useState('')
  const [tipo, setTipo] = useState('string')
  const [descripcion, setDescripcion] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadConfig() }, [])

  const loadConfig = async () => {
    try {
      const data = await configuracionService.getAll()
      setItems(data)
    } catch {
      Swal.fire('Error', 'No se pudieron cargar las configuraciones', 'error')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditClave(null)
    setClave('')
    setValor('')
    setTipo('string')
    setDescripcion('')
    setModalOpen(true)
  }

  const openEdit = async (item: ConfiguracionType) => {
    setEditClave(item.clave)
    setClave(item.clave)
    setValor(item.valor)
    setTipo(item.tipo)
    setDescripcion(item.descripcion || '')
    setModalOpen(true)
  }

  const handleDelete = async (clave: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar configuración?',
      text: `Se eliminará "${clave}"`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    })
    if (result.isConfirmed) {
      try {
        await configuracionService.delete(clave)
        Swal.fire('Eliminada', 'Configuración eliminada correctamente', 'success')
        loadConfig()
      } catch {
        Swal.fire('Error', 'No se pudo eliminar', 'error')
      }
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clave || !valor) {
      Swal.fire('Validación', 'Clave y valor son requeridos', 'warning')
      return
    }
    setSaving(true)
    try {
      await configuracionService.set({ clave, valor, tipo, descripcion: descripcion || undefined })
      Swal.fire(editClave ? 'Actualizada' : 'Creada', 'Configuración guardada correctamente', 'success')
      setModalOpen(false)
      loadConfig()
    } catch (err: any) {
      Swal.fire('Error', err?.response?.data?.message || 'Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  const tipoBadge = (t: string) => {
    switch (t) {
      case 'string': return 'bg-blue-50 text-blue-600'
      case 'number': return 'bg-emerald-50 text-emerald-600'
      case 'boolean': return 'bg-purple-50 text-purple-600'
      case 'json': return 'bg-orange-50 text-orange-600'
      default: return 'bg-slate-100 text-slate-500'
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Configuración</h3>
            <p className="text-sm text-slate-400 mt-0.5">{items.length} configuración(es)</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nueva Configuración
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 bg-slate-50/80">
                  <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">Clave</th>
                  <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">Valor</th>
                  <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">Tipo</th>
                  <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">Descripción</th>
                  <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((item) => (
                  <tr key={item.clave} className="hover:bg-slate-50/80 transition-colors duration-150 group">
                    <td className="py-3.5 px-4">
                      <p className="font-mono font-medium text-slate-800">{item.clave}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-mono text-slate-600 max-w-[200px] truncate">{item.valor}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${tipoBadge(item.tipo)}`}>{item.tipo}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-[250px] truncate">{item.descripcion || '-'}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-all duration-200 lg:translate-x-2 lg:group-hover:translate-x-0 lg:group-focus-within:translate-x-0">
                        <button onClick={() => openEdit(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(item.clave)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-slate-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                </svg>
                <p className="text-slate-400 font-medium">No hay configuraciones registradas</p>
                <button onClick={openCreate} className="mt-3 text-blue-600 text-sm font-medium hover:text-blue-700">Crear la primera configuración</button>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editClave ? 'Editar Configuración' : 'Nueva Configuración'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Clave *</label>
            <input value={clave} onChange={e => setClave(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="NOMBRE_CLAVE" required disabled={!!editClave} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Valor *</label>
            <input value={valor} onChange={e => setValor(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Valor de la configuración" required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                {tipoOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" placeholder="Descripción opcional" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2">
              {saving && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {editClave ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
