import { useMemo, useState } from 'react'

export type Direccion = 'asc' | 'desc'
export interface OrdenEstado {
  key: string
  dir: Direccion
}

/**
 * Ordenamiento por columna + paginación para listados.
 * `valor(item, key)` devuelve el dato comparable de cada fila para la columna `key`.
 */
export function useTabla<T>(
  items: T[],
  valor: (item: T, key: string) => string | number,
  porPagina = 10,
) {
  const [orden, setOrden] = useState<OrdenEstado | null>(null)
  const [pagina, setPagina] = useState(1)

  const ordenados = useMemo(() => {
    if (!orden) return items
    const arr = [...items]
    arr.sort((a, b) => {
      const va = valor(a, orden.key)
      const vb = valor(b, orden.key)
      const r =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb), 'es', { numeric: true, sensitivity: 'base' })
      return orden.dir === 'asc' ? r : -r
    })
    return arr
  }, [items, orden, valor])

  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / porPagina))
  const paginaActual = Math.min(pagina, totalPaginas)
  const visibles = useMemo(
    () => ordenados.slice((paginaActual - 1) * porPagina, paginaActual * porPagina),
    [ordenados, paginaActual, porPagina],
  )

  const cambiarOrden = (key: string) => {
    setPagina(1)
    setOrden((o) => (!o || o.key !== key ? { key, dir: 'asc' } : o.dir === 'asc' ? { key, dir: 'desc' } : null))
  }

  return {
    visibles,
    orden,
    setOrden,
    cambiarOrden,
    pagina: paginaActual,
    setPagina,
    totalPaginas,
    total: ordenados.length,
    desde: ordenados.length ? (paginaActual - 1) * porPagina + 1 : 0,
    hasta: Math.min(paginaActual * porPagina, ordenados.length),
  }
}
