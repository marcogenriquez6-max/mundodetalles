import { useEffect, useMemo, useState } from 'react'
import { categoriasService } from '../services/categorias.service'
import { productosService } from '../services/productos.service'
import { Categoria, Producto } from '../types'
import Swal from 'sweetalert2'
import Modal from '../components/Modal'
import { authService } from '../services/auth.service'
import { useTabla } from '../hooks/useTabla'
import Paginador from '../components/Paginador'
import ThOrdenable from '../components/ThOrdenable'

interface CategoriaForm {
  nombre: string
  descripcion: string
  padreId: string
}

const emptyForm: CategoriaForm = { nombre: '', descripcion: '', padreId: '' }

const valorCategoria = (c: Categoria, key: string): string | number => {
  switch (key) {
    case 'nombre': return c.nombre
    case 'descripcion': return c.descripcion || ''
    case 'padre': return c.padre?.nombre || ''
    default: return ''
  }
}

export default function Categorias() {
  const esAdmin = authService.getUsuario()?.rol === 'Administrador'
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<CategoriaForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => categorias.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (c.descripcion && c.descripcion.toLowerCase().includes(search.toLowerCase()))
  ), [categorias, search])

  const tabla = useTabla(filtered, valorCategoria)

  const conteoProductos = (id: string) => productos.filter(p => p.categoriaId === id).length

  useEffect(() => {
    Promise.allSettled([loadCategorias(), loadProductos()]).finally(() => setLoading(false))
  }, [])

  const loadCategorias = async () => {
    try {
      setCategorias(await categoriasService.getAll())
    } catch {
      Swal.fire('Error', 'No se pudieron cargar las categorías', 'error')
    }
  }

  const loadProductos = async () => {
    try {
      setProductos(await productosService.getAll())
    } catch {
      // Una categoría sin conteo de productos igual debe listarse.
    }
  }

  const openCreate = () => {
    setEditId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = async (id: string) => {
    try {
      const c = await categoriasService.getById(id)
      setEditId(id)
      setForm({ nombre: c.nombre, descripcion: c.descripcion || '', padreId: c.padreId || '' })
      setModalOpen(true)
    } catch {
      Swal.fire('Error', 'No se pudo cargar la categoría', 'error')
    }
  }

  const handleDelete = async (id: string, nombre: string) => {
    if (conteoProductos(id) > 0) {
      Swal.fire('No permitido', 'Esta categoría tiene productos asociados. Reasígnalos antes de eliminarla.', 'warning')
      return
    }
    const result = await Swal.fire({
      title: '¿Eliminar categoría?',
      text: `Se eliminará "${nombre}"`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    })
    if (result.isConfirmed) {
      try {
        await categoriasService.delete(id)
        Swal.fire('Eliminado', 'Categoría eliminada correctamente', 'success')
        loadCategorias()
      } catch (err: any) {
        Swal.fire('Error', err?.response?.data?.message || 'No se pudo eliminar', 'error')
      }
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        nombre: form.nombre,
        descripcion: form.descripcion || undefined,
        padreId: form.padreId || undefined,
      }
      if (editId) {
        await categoriasService.update(editId, payload)
        Swal.fire('Actualizado', 'Categoría actualizada correctamente', 'success')
      } else {
        await categoriasService.create(payload)
        Swal.fire('Creada', 'Categoría creada correctamente', 'success')
      }
      setModalOpen(false)
      loadCategorias()
    } catch (err: any) {
      Swal.fire('Error', err?.response?.data?.message?.join?.(', ') || err?.response?.data?.message || 'Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  const update = (field: keyof CategoriaForm, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  return (
    <div className="animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Categorías</h3>
            <p className="text-sm text-slate-400 mt-0.5">{categorias.length} categoría(s){search ? ` (${filtered.length} filtradas)` : ''}</p>
          </div>
          {esAdmin && (
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nueva Categoría
            </button>
          )}
        </div>

        <div className="relative mb-4">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar categoría..."
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
                  <ThOrdenable label="Descripción" col="descripcion" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Categoría Padre" col="padre" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-center">Productos</th>
                  {esAdmin && <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tabla.visibles.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors duration-150 group">
                    <td className="py-3.5 px-4 font-medium text-slate-800">{c.nombre}</td>
                    <td className="py-3.5 px-4 text-slate-600">{c.descripcion || '-'}</td>
                    <td className="py-3.5 px-4 text-slate-600">{c.padre?.nombre || '-'}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">{conteoProductos(c.id)}</span>
                    </td>
                    {esAdmin && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-200">
                          <button onClick={() => openEdit(c.id)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => handleDelete(c.id, c.nombre)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {tabla.total === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-400 font-medium">{search ? 'Sin resultados para tu búsqueda' : 'No hay categorías registradas'}</p>
                {!search && esAdmin && <button onClick={openCreate} className="mt-3 text-blue-600 text-sm font-medium hover:text-blue-700">Crear la primera categoría</button>}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Editar Categoría' : 'Nueva Categoría'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
            <input value={form.nombre} onChange={e => update('nombre', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Nombre de la categoría" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
            <textarea value={form.descripcion} onChange={e => update('descripcion', e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" placeholder="Descripción opcional" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Categoría Padre</label>
            <select value={form.padreId} onChange={e => update('padreId', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
              <option value="">Sin categoría padre</option>
              {categorias.filter(c => c.id !== editId).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all">
              {saving ? 'Guardando...' : editId ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
