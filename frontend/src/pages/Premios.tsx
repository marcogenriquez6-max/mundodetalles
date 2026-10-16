import { useEffect, useMemo, useState } from 'react'
import { premiosService } from '../services/premios.service'
import { clientesService } from '../services/clientes.service'
import { authService } from '../services/auth.service'
import { Premio, Cliente } from '../types'
import Modal from '../components/Modal'
import Swal from 'sweetalert2'
import { useTabla } from '../hooks/useTabla'
import Paginador from '../components/Paginador'

const valorPremio = (p: Premio, key: string): string | number => {
  switch (key) {
    case 'nombre': return p.nombre
    case 'puntos': return p.puntosRequeridos
    case 'stock': return p.stock
    default: return ''
  }
}

export default function Premios() {
  const [premios, setPremios] = useState<Premio[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [puntosRequeridos, setPuntosRequeridos] = useState(100)
  const [stock, setStock] = useState(10)
  const [esActivo, setEsActivo] = useState(true)

  const [canjeOpen, setCanjeOpen] = useState(false)
  const [canjePremio, setCanjePremio] = useState<Premio | null>(null)
  const [canjeClienteId, setCanjeClienteId] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const premiosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return premios
    return premios.filter(p =>
      p.nombre.toLowerCase().includes(q) || (p.descripcion || '').toLowerCase().includes(q),
    )
  }, [premios, busqueda])

  const tabla = useTabla(premiosFiltrados, valorPremio, 9)

  const handleOrden = (v: string) => {
    if (!v) { tabla.setOrden(null); tabla.setPagina(1); return }
    const [key, dir] = v.split('-') as [string, 'asc' | 'desc']
    tabla.setOrden({ key, dir })
    tabla.setPagina(1)
  }

  const rol = authService.getUsuario()?.rol
  const esAdmin = rol === 'Administrador'

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const [p, c] = await Promise.all([premiosService.getAll(), clientesService.getAll()])
      setPremios(p)
      setClientes(c)
    } catch {
      Swal.fire('Error', 'No se pudieron cargar los premios', 'error')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditId(null); setNombre(''); setDescripcion(''); setPuntosRequeridos(100); setStock(10); setEsActivo(true)
    setModalOpen(true)
  }

  const openEdit = (p: Premio) => {
    setEditId(p.id); setNombre(p.nombre); setDescripcion(p.descripcion || '')
    setPuntosRequeridos(p.puntosRequeridos); setStock(p.stock); setEsActivo(p.esActivo)
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) { Swal.fire('Validación', 'El nombre es requerido', 'warning'); return }
    setSaving(true)
    try {
      const dto = { nombre, descripcion: descripcion || undefined, puntosRequeridos, stock, esActivo }
      if (editId) await premiosService.update(editId, dto)
      else await premiosService.create(dto)
      Swal.fire('Guardado', `Premio ${editId ? 'actualizado' : 'creado'} correctamente`, 'success')
      setModalOpen(false); load()
    } catch (err: any) {
      Swal.fire('Error', err?.response?.data?.message || 'Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (p: Premio) => {
    const r = await Swal.fire({
      title: '¿Eliminar premio?', text: p.nombre, icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar', confirmButtonColor: '#dc2626',
    })
    if (!r.isConfirmed) return
    try { await premiosService.delete(p.id); Swal.fire('Eliminado', 'Premio eliminado', 'success'); load() }
    catch { Swal.fire('Error', 'No se pudo eliminar', 'error') }
  }

  const openCanje = (p: Premio) => { setCanjePremio(p); setCanjeClienteId(''); setCanjeOpen(true) }

  const clienteCanje = clientes.find(c => c.id === canjeClienteId)
  const puntosSuficientes = !!clienteCanje && canjePremio ? clienteCanje.puntosAcumulados >= canjePremio.puntosRequeridos : false

  const handleCanjear = async () => {
    if (!canjePremio || !canjeClienteId) return
    const usuario = authService.getUsuario()
    if (!usuario) return
    setSaving(true)
    try {
      await premiosService.canjear(canjePremio.id, canjeClienteId)
      Swal.fire('¡Canje exitoso!', `${clienteCanje?.nombre} canjeó "${canjePremio.nombre}"`, 'success')
      setCanjeOpen(false); load()
    } catch (err: any) {
      Swal.fire('Error', err?.response?.data?.message || 'No se pudo canjear', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Premios</h3>
            <p className="text-sm text-slate-400 mt-0.5">{tabla.total} premio(s) · canjeables por puntos de fidelización</p>
          </div>
          {esAdmin && (
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium text-sm rounded-xl hover:from-blue-600 hover:to-blue-700 shadow-sm shadow-blue-200 transition-all active:scale-95">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Nuevo Premio
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar premio…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
          </div>
          <select value={tabla.orden ? `${tabla.orden.key}-${tabla.orden.dir}` : ''} onChange={e => handleOrden(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none">
            <option value="">Ordenar por…</option>
            <option value="nombre-asc">Nombre (A–Z)</option>
            <option value="nombre-desc">Nombre (Z–A)</option>
            <option value="puntos-asc">Puntos (menor a mayor)</option>
            <option value="puntos-desc">Puntos (mayor a menor)</option>
            <option value="stock-desc">Stock (mayor a menor)</option>
            <option value="stock-asc">Stock (menor a mayor)</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          </div>
        ) : tabla.total === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-sm">{premios.length === 0 ? 'Aún no hay premios registrados.' : 'Sin resultados para la búsqueda.'}</p>
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tabla.visibles.map(p => {
              const agotado = p.stock <= 0
              return (
                <div key={p.id} className="border border-slate-200 rounded-2xl p-5 flex flex-col hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.048 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.05 9.771c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${p.esActivo && !agotado ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'}`}>{agotado ? 'Agotado' : p.esActivo ? 'Disponible' : 'Inactivo'}</span>
                  </div>
                  <h4 className="text-base font-bold text-slate-800 mt-3">{p.nombre}</h4>
                  {p.descripcion && <p className="text-sm text-slate-400 mt-1 line-clamp-2">{p.descripcion}</p>}
                  <div className="flex items-center gap-4 mt-4">
                    <div>
                      <p className="text-xl font-bold text-blue-600">{p.puntosRequeridos}</p>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wide">puntos</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-slate-700">{p.stock}</p>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wide">en stock</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                    <button onClick={() => openCanje(p)} disabled={agotado || !p.esActivo}
                      className="flex-1 py-2 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                      Canjear
                    </button>
                    {esAdmin && (
                      <>
                        <button onClick={() => openEdit(p)} title="Editar" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(p)} title="Eliminar" className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <Paginador
            pagina={tabla.pagina}
            totalPaginas={tabla.totalPaginas}
            total={tabla.total}
            desde={tabla.desde}
            hasta={tabla.hasta}
            onChange={tabla.setPagina}
          />
          </>
        )}
      </div>

      {/* Crear / Editar premio */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Editar Premio' : 'Nuevo Premio'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} required placeholder="Ej: Taza personalizada de regalo"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2} placeholder="Opcional"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Puntos requeridos *</label>
              <input type="number" min="1" value={puntosRequeridos} onChange={e => setPuntosRequeridos(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Stock *</label>
              <input type="number" min="0" value={stock} onChange={e => setStock(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={esActivo} onChange={e => setEsActivo(e.target.checked)} className="w-4 h-4 rounded accent-blue-600" />
            Premio activo
          </label>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all">{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>

      {/* Canjear premio */}
      <Modal open={canjeOpen} onClose={() => setCanjeOpen(false)} title="Canjear Premio">
        {canjePremio && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-base font-bold text-slate-800">{canjePremio.nombre}</p>
              <p className="text-sm text-slate-500 mt-0.5">Requiere <strong>{canjePremio.puntosRequeridos} puntos</strong> · {canjePremio.stock} en stock</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
              <select value={canjeClienteId} onChange={e => setCanjeClienteId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none">
                <option value="">Seleccionar cliente…</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido} — {c.puntosAcumulados} pts</option>)}
              </select>
            </div>
            {clienteCanje && (
              <div className={`text-sm rounded-lg px-3 py-2 ${puntosSuficientes ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {clienteCanje.nombre} tiene <strong>{clienteCanje.puntosAcumulados}</strong> puntos.
                {puntosSuficientes ? ` Quedará con ${clienteCanje.puntosAcumulados - canjePremio.puntosRequeridos} tras el canje.` : ' Puntos insuficientes para este premio.'}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setCanjeOpen(false)} className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
              <button onClick={handleCanjear} disabled={saving || !canjeClienteId || !puntosSuficientes}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                {saving ? 'Canjeando…' : 'Confirmar Canje'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
