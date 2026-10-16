import { useEffect, useMemo, useState } from 'react'
import { proveedoresService } from '../services/proveedores.service'
import { Proveedor } from '../types'
import Swal from 'sweetalert2'
import Modal from '../components/Modal'
import { authService } from '../services/auth.service'
import { useTabla } from '../hooks/useTabla'
import Paginador from '../components/Paginador'
import ThOrdenable from '../components/ThOrdenable'

interface ProveedorForm {
  nombre: string
  contacto: string
  telefono: string
  email: string
  direccion: string
  nit: string
  esActivo: boolean
}

const emptyForm: ProveedorForm = {
  nombre: '', contacto: '', telefono: '', email: '', direccion: '', nit: '', esActivo: true,
}

const valorProveedor = (p: Proveedor, key: string): string | number => {
  switch (key) {
    case 'nombre': return p.nombre
    case 'contacto': return p.contacto || ''
    case 'telefono': return p.telefono || ''
    case 'email': return p.email || ''
    case 'nit': return p.nit || ''
    case 'estado': return p.esActivo ? 1 : 0
    default: return ''
  }
}

export default function Proveedores() {
  const esAdmin = authService.getUsuario()?.rol === 'Administrador'
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<ProveedorForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => proveedores.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (p.contacto && p.contacto.toLowerCase().includes(search.toLowerCase()))
  ), [proveedores, search])

  const tabla = useTabla(filtered, valorProveedor)

  useEffect(() => { loadProveedores() }, [])

  const loadProveedores = async () => {
    try {
      const data = await proveedoresService.getAll()
      setProveedores(data)
    } catch {
      Swal.fire('Error', 'No se pudieron cargar los proveedores', 'error')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = async (id: string) => {
    try {
      const p = await proveedoresService.getById(id)
      setEditId(id)
      setForm({
        nombre: p.nombre,
        contacto: p.contacto || '',
        telefono: p.telefono || '',
        email: p.email || '',
        direccion: p.direccion || '',
        nit: p.nit || '',
        esActivo: p.esActivo,
      })
      setModalOpen(true)
    } catch {
      Swal.fire('Error', 'No se pudo cargar el proveedor', 'error')
    }
  }

  const handleDelete = async (id: string, nombre: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar proveedor?',
      text: `Se eliminará "${nombre}"`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    })
    if (result.isConfirmed) {
      try {
        await proveedoresService.delete(id)
        Swal.fire('Eliminado', 'Proveedor eliminado correctamente', 'success')
        loadProveedores()
      } catch {
        Swal.fire('Error', 'No se pudo eliminar', 'error')
      }
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        contacto: form.contacto || undefined,
        telefono: form.telefono || undefined,
        email: form.email || undefined,
        direccion: form.direccion || undefined,
        nit: form.nit || undefined,
      }
      if (editId) {
        await proveedoresService.update(editId, payload)
        Swal.fire('Actualizado', 'Proveedor actualizado correctamente', 'success')
      } else {
        await proveedoresService.create(payload)
        Swal.fire('Creado', 'Proveedor creado correctamente', 'success')
      }
      setModalOpen(false)
      loadProveedores()
    } catch (err: any) {
      Swal.fire('Error', err?.response?.data?.message?.join?.(', ') || err?.response?.data?.message || 'Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  const update = (field: keyof ProveedorForm, value: any) => setForm(prev => ({ ...prev, [field]: value }))

  return (
    <div className="animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Proveedores</h3>
            <p className="text-sm text-slate-400 mt-0.5">{proveedores.length} proveedor(es){search ? ` (${filtered.length} filtrados)` : ''}</p>
          </div>
          {esAdmin && <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Proveedor
          </button>}
        </div>

        <div className="relative mb-4">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o contacto..."
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
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 bg-slate-50/80">
                  <ThOrdenable label="Nombre" col="nombre" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Contacto" col="contacto" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Teléfono" col="telefono" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Email" col="email" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="NIT" col="nit" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Estado" col="estado" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tabla.visibles.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors duration-150 group">
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-slate-800">{p.nombre}</p>
                      {p.direccion && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{p.direccion}</p>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{p.contacto || '-'}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono">{p.telefono || '-'}</td>
                    <td className="py-3.5 px-4 text-slate-600">{p.email || '-'}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono">{p.nit || '-'}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        p.esActivo ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {p.esActivo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-all duration-200 lg:translate-x-2 lg:group-hover:translate-x-0 lg:group-focus-within:translate-x-0">
                        {esAdmin && <button onClick={() => openEdit(p.id)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>}
                        {esAdmin && <button onClick={() => handleDelete(p.id, p.nombre)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tabla.total === 0 && (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-slate-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="text-slate-400 font-medium">{search ? 'Sin resultados para tu búsqueda' : 'No hay proveedores registrados'}</p>
                {!search && esAdmin && <button onClick={openCreate} className="mt-3 text-blue-600 text-sm font-medium hover:text-blue-700">Crear el primer proveedor</button>}
              </div>
            )}
            <Paginador
              pagina={tabla.pagina}
              totalPaginas={tabla.totalPaginas}
              total={tabla.total}
              desde={tabla.desde}
              hasta={tabla.hasta}
              onChange={tabla.setPagina}
            />
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Editar Proveedor' : 'Nuevo Proveedor'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
            <input value={form.nombre} onChange={e => update('nombre', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Nombre del proveedor" required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contacto</label>
              <input value={form.contacto} onChange={e => update('contacto', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Nombre del contacto" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
              <input value={form.telefono} onChange={e => update('telefono', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="+591 71234567" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => update('email', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="proveedor@ejemplo.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">NIT</label>
              <input value={form.nit} onChange={e => update('nit', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="1234567890" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
            <textarea value={form.direccion} onChange={e => update('direccion', e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" placeholder="Dirección del proveedor" />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.esActivo} onChange={e => update('esActivo', e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
            <span className="text-sm text-slate-700">Proveedor activo</span>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2">
              {saving && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {editId ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
