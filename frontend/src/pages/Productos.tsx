import { useEffect, useMemo, useRef, useState } from 'react'
import { productosService } from '../services/productos.service'
import { Producto, Categoria } from '../types'
import Swal from 'sweetalert2'
import Modal from '../components/Modal'
import api from '../services/api'
import { authService } from '../services/auth.service'
import { uploadsService } from '../services/uploads.service'
import { useTabla } from '../hooks/useTabla'
import Paginador from '../components/Paginador'
import ThOrdenable from '../components/ThOrdenable'

interface ProductoForm {
  nombre: string
  descripcion: string
  categoriaId: string
  precioBase: number | string
  precioMayorista: number | string
  costoPromedio: number | string
  stockActual: number | string
  stockMinimo: number | string
  stockMaximo: number | string
  unidadMedida: string
  rutaImagen: string
  esActivo: boolean
  otorgaPuntos: boolean
}

const emptyForm: ProductoForm = {
  nombre: '', descripcion: '', categoriaId: '',
  precioBase: '', precioMayorista: '', costoPromedio: '',
  stockActual: '', stockMinimo: '', stockMaximo: '',
  unidadMedida: 'unidad', rutaImagen: '', esActivo: true, otorgaPuntos: false,
}

const valorProducto = (p: Producto, key: string): string | number => {
  switch (key) {
    case 'sku': return p.sku
    case 'nombre': return p.nombre
    case 'precio': return Number(p.precioBase)
    case 'stock': return Number(p.stockActual)
    case 'estado': return p.esActivo ? 1 : 0
    default: return ''
  }
}

export default function Productos() {
  const esAdmin = authService.getUsuario()?.rol === 'Administrador'
  const [proveedores, setProveedores] = useState<{ id: string; nombre: string }[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductoForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [entradaModal, setEntradaModal] = useState(false)
  const [entradaProd, setEntradaProd] = useState<Producto | null>(null)
  const [entradaCant, setEntradaCant] = useState(1)
  const [entradaCosto, setEntradaCosto] = useState('')
  const [entradaProv, setEntradaProv] = useState('')
  const [guardandoEntrada, setGuardandoEntrada] = useState(false)
  const [subiendoImagen, setSubiendoImagen] = useState(false)
  const imagenInputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => productos.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  ), [productos, search])

  const tabla = useTabla(filtered, valorProducto)

  useEffect(() => {
    Promise.all([loadProductos(), loadCategorias()])
  }, [])

  const loadProductos = async () => {
    try {
      const data = await productosService.getAll()
      setProductos(data)
    } catch {
      Swal.fire('Error', 'No se pudieron cargar los productos', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadCategorias = async () => {
    try {
      const [{ data }, { data: prov }] = await Promise.all([api.get('/categorias'), api.get('/proveedores')])
      setCategorias(data)
      setProveedores(prov)
    } catch {}
  }

  const openCreate = () => {
    setEditId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const subirImagen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setSubiendoImagen(true)
    try {
      const url = await uploadsService.subirImagen(file)
      update('rutaImagen', url)
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'No se pudo subir la imagen', 'error')
    } finally {
      setSubiendoImagen(false)
    }
  }

  const crearCategoria = async () => {
    const { value: nombre } = await Swal.fire({
      title: 'Nueva categoría',
      input: 'text',
      inputPlaceholder: 'Nombre de la categoría',
      showCancelButton: true,
      confirmButtonText: 'Crear',
      cancelButtonText: 'Cancelar',
      inputValidator: (v) => (!v || v.trim().length < 2 ? 'Ingrese al menos 2 caracteres' : undefined),
    })
    if (!nombre) return
    try {
      const { data } = await api.post('/categorias', { nombre: nombre.trim() })
      await loadCategorias()
      update('categoriaId', data.id)
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Categoría creada', showConfirmButton: false, timer: 2000 })
    } catch (err: any) {
      const msg = err?.response?.data?.message
      Swal.fire('Error', Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo crear la categoría', 'error')
    }
  }

  const openEdit = async (id: string) => {
    try {
      const p = await productosService.getById(id)
      setEditId(id)
      setForm({
        nombre: p.nombre,
        descripcion: p.descripcion || '',
        categoriaId: p.categoriaId,
        precioBase: p.precioBase,
        precioMayorista: p.precioMayorista || '',
        costoPromedio: p.costoPromedio || '',
        stockActual: p.stockActual,
        stockMinimo: p.stockMinimo,
        stockMaximo: p.stockMaximo || '',
        unidadMedida: p.unidadMedida || 'unidad',
        rutaImagen: p.rutaImagen || '',
        esActivo: p.esActivo,
        otorgaPuntos: !!p.otorgaPuntos,
      })
      setModalOpen(true)
    } catch {
      Swal.fire('Error', 'No se pudo cargar el producto', 'error')
    }
  }

  const handleDelete = async (id: string, nombre: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar producto?',
      text: `Se eliminará "${nombre}"`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    })
    if (result.isConfirmed) {
      try {
        await productosService.delete(id)
        Swal.fire('Eliminado', 'Producto eliminado correctamente', 'success')
        loadProductos()
      } catch {
        Swal.fire('Error', 'No se pudo eliminar', 'error')
      }
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (form.costoPromedio && Number(form.precioBase) <= Number(form.costoPromedio)) {
        Swal.fire('Validación', 'El precio de venta debe ser mayor al costo promedio', 'warning')
        setSaving(false)
        return
      }
      if (!form.categoriaId) {
        Swal.fire('Validación', 'Seleccione una categoría (o cree una con el botón "Nueva")', 'warning')
        setSaving(false)
        return
      }
      // Al editar, un campo opcional vaciado se envía como null para que se borre de verdad.
      const vacio = editId ? null : undefined
      const payload = {
        ...form,
        precioBase: Number(form.precioBase),
        precioMayorista: form.precioMayorista ? Number(form.precioMayorista) : vacio,
        costoPromedio: form.costoPromedio ? Number(form.costoPromedio) : vacio,
        stockActual: Number(form.stockActual),
        stockMinimo: Number(form.stockMinimo),
        stockMaximo: form.stockMaximo ? Number(form.stockMaximo) : editId ? 0 : undefined,
        unidadMedida: form.unidadMedida,
        rutaImagen: form.rutaImagen || vacio,
      }

      if (editId) {
        await productosService.update(editId, payload as any)
        Swal.fire('Actualizado', 'Producto actualizado correctamente', 'success')
      } else {
        await productosService.create(payload as any)
        Swal.fire('Creado', 'Producto creado correctamente', 'success')
      }
      setModalOpen(false)
      loadProductos()
    } catch (err: any) {
      Swal.fire('Error', err?.response?.data?.message?.join?.(', ') || err?.response?.data?.message || 'Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  const update = (field: keyof ProductoForm, value: any) => setForm(prev => ({ ...prev, [field]: value }))

  return (
    <div className="animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Productos</h3>
            <p className="text-sm text-slate-400 mt-0.5">{productos.length} producto(s){search ? ` (${filtered.length} filtrados)` : ''}</p>
          </div>
          {esAdmin && <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Producto
          </button>}
        </div>

        <div className="relative mb-4">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o SKU..."
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
                  <ThOrdenable label="SKU" col="sku" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Nombre" col="nombre" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Precio" col="precio" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Stock" col="stock" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <ThOrdenable label="Estado" col="estado" orden={tabla.orden} onOrdenar={tabla.cambiarOrden} />
                  <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tabla.visibles.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors duration-150 group">
                    <td className="py-3.5 px-4 font-mono text-sm text-slate-600">{p.sku}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {p.rutaImagen && (
                          <img src={p.rutaImagen} alt="" className="w-9 h-9 rounded-lg object-cover bg-slate-100 ring-1 ring-slate-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        )}
                        <div>
                          <p className="font-medium text-slate-800">{p.nombre}{p.otorgaPuntos && <span title="Otorga puntos de fidelización" className="ml-1.5 align-middle inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-600">PUNTOS</span>}</p>
                          {p.descripcion && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{p.descripcion}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800 font-mono">Bs. {Number(p.precioBase).toFixed(2)}</p>
                      {p.costoPromedio && (
                        <p className="text-[11px] text-slate-400">Margen: {((Number(p.precioBase) - Number(p.costoPromedio)) / Number(p.costoPromedio) * 100).toFixed(1)}%</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        p.stockActual <= p.stockMinimo ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.stockActual <= p.stockMinimo ? 'bg-red-500 animate-pulse-soft' : 'bg-green-500'}`} />
                        {p.stockActual} {p.unidadMedida || 'unidad'}(es)
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        p.esActivo ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {p.esActivo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-all duration-200 lg:translate-x-2 lg:group-hover:translate-x-0 lg:group-focus-within:translate-x-0">
                        {esAdmin && <button onClick={() => { setEntradaProd(p); setEntradaCant(1); setEntradaCosto(''); setEntradaProv(''); setEntradaModal(true) }}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Entrada de stock">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                        </button>}
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-slate-400 font-medium">{search ? 'Sin resultados para tu búsqueda' : 'No hay productos registrados'}</p>
                {!search && <button onClick={openCreate} className="mt-3 text-blue-600 text-sm font-medium hover:text-blue-700">Crear el primer producto</button>}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Editar Producto' : 'Nuevo Producto'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
              <input value={form.nombre} onChange={e => update('nombre', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Nombre del producto" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Categoría *</label>
              <div className="flex gap-2">
                <select value={form.categoriaId} onChange={e => update('categoriaId', e.target.value)} required className="flex-1 min-w-0 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                  <option value="" disabled>Seleccione…</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <button type="button" onClick={crearCategoria} title="Crear nueva categoría"
                  className="shrink-0 flex items-center gap-1 px-3 rounded-xl border border-blue-200 text-blue-600 text-sm font-medium bg-blue-50/50 hover:bg-blue-100 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  Nueva
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
            <textarea value={form.descripcion} onChange={e => update('descripcion', e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" placeholder="Descripción opcional" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Precio Venta *</label>
              <input type="number" step="0.01" min="0.01" value={form.precioBase} onChange={e => update('precioBase', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Bs. 0.00" required />
              {form.costoPromedio && Number(form.precioBase) <= Number(form.costoPromedio) && (
                <p className="text-xs text-red-500 mt-1">Debe ser mayor al costo</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Precio May.</label>
              <input type="number" step="0.01" min="0.01" value={form.precioMayorista} onChange={e => update('precioMayorista', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Bs." />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Costo Prom.</label>
              <input type="number" step="0.01" min="0" value={form.costoPromedio} onChange={e => update('costoPromedio', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Bs." />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Stock Actual *</label>
              <input type="number" min="0" value={form.stockActual} onChange={e => update('stockActual', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="0" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Stock Mínimo</label>
              <input type="number" min="0" value={form.stockMinimo} onChange={e => update('stockMinimo', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Stock Máximo</label>
              <input type="number" min="0" value={form.stockMaximo} onChange={e => update('stockMaximo', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Opcional" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unidad Medida</label>
              <select value={form.unidadMedida} onChange={e => update('unidadMedida', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                <option value="unidad">Unidad</option>
                <option value="caja">Caja</option>
                <option value="paquete">Paquete</option>
                <option value="metro">Metro</option>
                <option value="litro">Litro</option>
                <option value="kilogramo">Kilogramo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Imagen del producto</label>
              <input ref={imagenInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={subirImagen} />
              <div className="flex items-center gap-3">
                {form.rutaImagen ? (
                  <img src={form.rutaImagen} alt="Vista previa" className="w-14 h-14 rounded-xl object-cover bg-slate-100 ring-1 ring-slate-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center text-slate-300">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <button type="button" onClick={() => imagenInputRef.current?.click()} disabled={subiendoImagen}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors">
                    {subiendoImagen ? (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 12V4m0 0L8 8m4-4l4 4" /></svg>
                    )}
                    {subiendoImagen ? 'Subiendo…' : 'Subir imagen'}
                  </button>
                  {form.rutaImagen && (
                    <button type="button" onClick={() => update('rutaImagen', '')} className="text-xs text-red-500 hover:text-red-600 text-left">Quitar imagen</button>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">JPG, PNG, WEBP o GIF (máx. 5 MB).</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.esActivo} onChange={e => update('esActivo', e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
              <span className="text-sm text-slate-700">Producto activo</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.otorgaPuntos} onChange={e => update('otorgaPuntos', e.target.checked)} className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500" />
              <span className="text-sm text-slate-700">Otorga puntos de fidelización</span>
            </label>
          </div>
          {editId && (
            <p className="text-[11px] text-slate-400 -mt-2">Si corrige el stock actual, la diferencia se registra automáticamente como AJUSTE en el Kardex.</p>
          )}

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

      <Modal open={entradaModal} onClose={() => setEntradaModal(false)} title={`Entrada de Stock — ${entradaProd?.nombre || ''}`}>
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Registra el ingreso de mercadería al inventario. El stock actual aumentará automáticamente.</p>

          <div className="bg-slate-50 rounded-xl p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-400">SKU:</span> <span className="font-medium text-slate-700">{entradaProd?.sku}</span></div>
              <div><span className="text-slate-400">Stock actual:</span> <span className="font-bold text-slate-800">{entradaProd?.stockActual}</span></div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad a ingresar *</label>
              <input type="number" min="1" value={entradaCant} onChange={e => setEntradaCant(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Costo por unidad (Bs.)</label>
              <input type="number" step="0.01" min="0" value={entradaCosto} onChange={e => setEntradaCosto(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Opcional" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Proveedor</label>
            <select value={entradaProv} onChange={e => setEntradaProv(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">Sin especificar</option>
              {proveedores.map(pv => <option key={pv.id} value={pv.nombre}>{pv.nombre}</option>)}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">Queda registrado en el Kardex como ENTRADA (compra).</p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEntradaModal(false)}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
            <button onClick={async () => {
              setGuardandoEntrada(true)
              try {
                // Ingreso de mercadería: el servidor suma el stock, recalcula el costo
                // promedio ponderado y registra la ENTRADA en el Kardex (una sola transacción).
                await api.post('/kardex', {
                  productoId: entradaProd!.id,
                  tipoMovimiento: 'ENTRADA',
                  cantidad: entradaCant,
                  costoUnitario: entradaCosto ? Number(entradaCosto) : undefined,
                  referencia: 'COMPRA',
                  observacion: entradaProv ? `Compra a ${entradaProv}` : 'Ingreso de mercadería',
                })
                Swal.fire('Entrada registrada', `Se agregaron ${entradaCant} unidad(es) a ${entradaProd?.nombre}`, 'success')
                setEntradaModal(false)
                loadProductos()
              } catch (err: any) {
                const msg = err?.response?.data?.message
                Swal.fire('Error', Array.isArray(msg) ? msg.join(', ') : msg || 'Error al registrar entrada', 'error')
              } finally { setGuardandoEntrada(false) }
            }} disabled={guardandoEntrada}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-medium rounded-xl hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 transition-all flex items-center gap-2">
              {guardandoEntrada && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              Registrar Entrada
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
