/** Fecha local (zona horaria del navegador) en formato AAAA-MM-DD; evita el corrimiento de día de toISOString (UTC). */
export function fechaLocal(d: Date | string): string {
  const f = typeof d === 'string' ? new Date(d) : d
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`
}

/**
 * Muestra una fecha sin hora (columna DATE, p. ej. '2026-10-30') como DD/MM/AAAA
 * sin pasar por UTC: `new Date('2026-10-30')` en Bolivia (UTC−4) daría el día anterior.
 */
export function formatoFechaSolo(valor?: string | Date | null): string {
  if (!valor) return '-'
  const s = typeof valor === 'string' ? valor : fechaLocal(valor)
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s
}
