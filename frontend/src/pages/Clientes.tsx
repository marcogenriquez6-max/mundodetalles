import { useEffect, useMemo, useState } from 'react'
import { clientesService } from '../services/clientes.service'
import { authService } from '../services/auth.service'
import { Cliente } from '../types'
import Swal from 'sweetalert2'
import Modal from '../components/Modal'
import { useTabla } from '../hooks/useTabla'
import Paginador from '../components/Paginador'
import ThOrdenable from '../components/ThOrdenable'

interface ClienteForm {
  tipoDocumento: string
  numeroDocumento: string
  nombre: string
  apellido: string
  email: string
  telefono: string
  direccion: string
}

const emptyForm: ClienteForm = {
  tipoDocumento: 'CI',
  numeroDocumento: '',
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
  direccion: '',
}

const niveles = ['BRONCE', 'PLATA', 'ORO', 'PLATINO'] as const

const valorCliente = (c: Cliente, key: string): string | number => {
  switch (key) {
    case 'documento': return c.numeroDocumento
    case 'nombre': return `${c.nombre} ${c.apellido}`
    case 'email': return c.email || ''
    case 'puntos': return c.puntosAcumulados
    case 'nivel': return c.nivelFidelizacion
    default: return ''
  }
}

const nivelBadge = (nivel: string) => {
  const map: Record<string, string> = {
    BRONCE: 'bg-amber-50 text-amber-600 border-amber-200',
    PLATA: 'bg-slate-100 text-slate-600 border-slate-200',
    ORO: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    PLATINO: 'bg-purple-50 text-purple-600 border-purple-200',
  }
  return map[nivel] || 'bg-gray-100 text-gray-700'
}

const nivelIcon = (nivel: string) => {
  const map: Record<string, string> = {
    BRONCE: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    PLATA: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    ORO: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
    PLATINO: 'M13 10V3L4 14h7v7l9-11h-7z',
  }
  return map[nivel] || map.BRONCE
}

export default function Clientes() {
  const rol = authService.getUsuario()?.rol
  const puedeEditar = rol === 'Administrador' || rol === 'Cajero'
  const puedeEliminar = rol === 'Administrador'
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<ClienteForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => clientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.apellido.toLowerCase().includes(search.toLowerCase()) ||
    c.numeroDocumento.toLowerCase().includes(search.toLowerCase())
  ), [clientes, search])

  const tabla = useTabla(filtered, valorCliente)

  useEffect(() => { loadClientes() }, [])

  const loadClientes = async () => {
    try {
      const data = await clientesService.getAll()
      setClientes(data)
    } catch {
      Swal.fire('Error', 'No se pudieron cargar los clientes', 'error')
    } finally { setLoading(false) }
  }

  const openCreate = () => {
    setEditId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = async (id: string) => {
    try {
      const c = await clientesService.getById(id)
      setEditId(id)
      setForm({
        tipoDocumento: c.tipoDocumento,
        numeroDocumento: c.numeroDocumento,
        nombre: c.nombre,
        apellido: c.apellido,
        email: c.email || '',
        telefono: c.telefono || '',
        direccion: c.direccion || '',
      })
      setModalOpen(true)
    } catch {
      Swal.fire('Error', 'No se pudo cargar el cliente', 'error')
    }
  }

  const handleDelete = async (id: string, nombre: string) => {
    const r = await Swal.fire({
      title: '¿Eliminar cliente?',
      text: `Se eliminará "${nombre}"`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    })
    if (r.isConfirmed) {
      try {
        await clientesService.delete(id)
        Swal.fire('Eliminado', 'Cliente eliminado correctamente', 'success')
        loadClientes()
      } catch { Swal.fire('Error', 'No se pudo eliminar', 'error') }
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Campos opcionales vacíos se envían como ausentes (no como texto vacío).
      const payload = {
        ...form,
        numeroDocumento: form.numeroDocumento.trim(),
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        email: form.email.trim() || undefined,
        telefono: form.telefono.trim() || undefined,
        direccion: form.direccion.trim() || undefined,
      }
      if (editId) {
        await clientesService.update(editId, payload)
        Swal.fire('Actualizado', 'Cliente actualizado correctamente', 'success')
      } else {
        await clientesService.create(payload as any)
        Swal.fire('Creado', 'Cliente creado correctamente', 'success')
      }
      setModalOpen(false)
      loadClientes()
    } catch (err: any) {
      const msg = err?.response?.data?.message
      Swal.fire('Error', Array.isArray(msg) ? msg.join(', ') : msg || 'Error al guardar', 'error')
    } finally { setSaving(false) }
  }

  const update = (field: keyof ClienteForm, value: any) => setForm(prev => ({ ...prev, [field]: value }))

  return (
    <div className="animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Clientes</h3>
            <p className="text-sm text-slate-400 mt-0.5">{clientes.length} cliente(s){search ? ` (${filtered.length} filtrados)` : ''}</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Cliente
          </button>
        </div>

        <div className="relative mb-4">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, apellido o documento..."
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
                  <ThOrdenable label="Documento" col="documento" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Nombre" col="nombre" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Email" col="email" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Puntos" col="puntos" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Nivel" col="nivel" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tabla.visibles.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors duration-150 group">
                    <td className="py-3.5 px-4 font-mono text-sm text-slate-600">{c.numeroDocumento}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-slate-800">{c.nombre} {c.apellido}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{c.email || <span className="text-slate-300">—</span>}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-700">{c.puntosAcumulados}</span>
                      <span className="text-xs text-slate-400 ml-1">pts</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${nivelBadge(c.nivelFidelizacion)}`}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={nivelIcon(c.nivelFidelizacion)} />
                        </svg>
                        {c.nivelFidelizacion}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-all duration-200 lg:translate-x-2 lg:group-hover:translate-x-0 lg:group-focus-within:translate-x-0">
                        {puedeEditar && <button onClick={() => openEdit(c.id)} title="Editar" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>}
                        {puedeEliminar && <button onClick={() => handleDelete(c.id, `${c.nombre} ${c.apellido}`)} title="Eliminar" className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <p className="text-slate-400 font-medium">{search ? 'Sin resultados para tu búsqueda' : 'No hay clientes registrados'}</p>
                {!search && <button onClick={openCreate} className="mt-3 text-blue-600 text-sm font-medium hover:text-blue-700">Crear el primer cliente</button>}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Editar Cliente' : 'Nuevo Cliente'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo Doc.</label>
              <select value={form.tipoDocumento} onChange={e => update('tipoDocumento', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                <option value="CI">C.I. (cédula de identidad)</option>
                <option value="NIT">NIT</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">N° Documento *</label>
              <input value={form.numeroDocumento} onChange={e => update('numeroDocumento', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="12345678" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
              <input value={form.nombre} onChange={e => update('nombre', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Juan" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Apellido *</label>
              <input value={form.apellido} onChange={e => update('apellido', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Pérez" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => update('email', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="cliente@ejemplo.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
              <input value={form.telefono} onChange={e => update('telefono', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="71234567" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
            <textarea value={form.direccion} onChange={e => update('direccion', e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" placeholder="Dirección del cliente" />
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
              {editId ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
