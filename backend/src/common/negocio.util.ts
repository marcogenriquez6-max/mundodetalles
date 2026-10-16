import { EntityManager } from 'typeorm';
import { Configuracion } from '../entities/configuracion.entity';

/** Niveles del programa de fidelización, de menor a mayor. */
export const NIVELES = ['BRONCE', 'PLATA', 'ORO', 'PLATINO'] as const;

/** Puntos por defecto para alcanzar cada nivel (configurables en la tabla configuracion). */
const UMBRALES_DEFECTO: Record<string, number> = { PLATA: 500, ORO: 1000, PLATINO: 1500 };

/** Lee un parámetro numérico de la configuración del negocio, con valor por defecto. */
export async function leerConfigNumero(manager: EntityManager, clave: string, def: number): Promise<number> {
  const row = await manager.findOne(Configuracion, { where: { clave } });
  const n = row ? Number(row.valor) : NaN;
  return Number.isFinite(n) ? n : def;
}

/** Umbrales de puntos de cada nivel: { BRONCE: 0, PLATA: 500, ORO: 1000, PLATINO: 1500 }. */
export async function umbralesNivel(manager: EntityManager): Promise<Record<string, number>> {
  return {
    BRONCE: 0,
    PLATA: await leerConfigNumero(manager, 'puntos_nivel_plata', UMBRALES_DEFECTO.PLATA),
    ORO: await leerConfigNumero(manager, 'puntos_nivel_oro', UMBRALES_DEFECTO.ORO),
    PLATINO: await leerConfigNumero(manager, 'puntos_nivel_platino', UMBRALES_DEFECTO.PLATINO),
  };
}

/** Nivel que corresponde a un saldo de puntos según los umbrales. */
export function nivelPorPuntos(puntos: number, umbrales: Record<string, number>): string {
  let nivel: string = 'BRONCE';
  for (const n of NIVELES) if (puntos >= umbrales[n]) nivel = n;
  return nivel;
}

/**
 * Nivel resultante tras ACUMULAR puntos: el cliente sube de nivel al alcanzar el
 * umbral, y nunca baja por canjear sus puntos (el nivel premia la trayectoria).
 */
export function nivelTrasAcumular(nivelActual: string, saldo: number, umbrales: Record<string, number>): string {
  const porSaldo = nivelPorPuntos(saldo, umbrales);
  return NIVELES.indexOf(porSaldo as any) > NIVELES.indexOf(nivelActual as any) ? porSaldo : nivelActual;
}

/** Redondea a 2 decimales (montos monetarios). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Inicio y fin (inclusive) de un rango de fechas YYYY-MM-DD en hora local. */
export function rangoFechas(desde?: string, hasta?: string): { desde?: Date; hasta?: Date } {
  const valida = (f?: string) => !!f && /^\d{4}-\d{2}-\d{2}$/.test(f);
  return {
    desde: valida(desde) ? new Date(`${desde}T00:00:00`) : undefined,
    hasta: valida(hasta) ? new Date(`${hasta}T23:59:59.999`) : undefined,
  };
}

/** Fecha local en formato YYYY-MM-DD (no UTC). */
export function fechaLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
