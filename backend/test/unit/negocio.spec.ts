/**
 * Pruebas unitarias de la lógica de negocio aislada (sin base de datos).
 * Ejecutar:  npm test
 */
// Carga primero Usuario: resuelve el ciclo de importación BaseEntity <-> Usuario (como hace TypeORM al iniciar).
import '../../src/entities/usuario.entity';
import { test, describe } from 'node:test';
import * as assert from 'node:assert/strict';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { QueryFailedError } from 'typeorm';
import {
  nivelPorPuntos,
  nivelTrasAcumular,
  round2,
  rangoFechas,
  fechaLocal,
} from '../../src/common/negocio.util';
import { completarVenta, revertirPuntos } from '../../src/common/venta-completar';
import { RolesGuard } from '../../src/common/guards/roles.guard';
import { QueryFailedFilter } from '../../src/common/filters/query-failed.filter';

const UMBRALES = { BRONCE: 0, PLATA: 500, ORO: 1000, PLATINO: 1500 };

describe('Niveles de fidelización', () => {
  test('el nivel corresponde al umbral alcanzado', () => {
    assert.equal(nivelPorPuntos(0, UMBRALES), 'BRONCE');
    assert.equal(nivelPorPuntos(499, UMBRALES), 'BRONCE');
    assert.equal(nivelPorPuntos(500, UMBRALES), 'PLATA');
    assert.equal(nivelPorPuntos(1000, UMBRALES), 'ORO');
    assert.equal(nivelPorPuntos(5000, UMBRALES), 'PLATINO');
  });
  test('al acumular se sube de nivel, nunca se baja', () => {
    assert.equal(nivelTrasAcumular('BRONCE', 620, UMBRALES), 'PLATA');
    assert.equal(nivelTrasAcumular('ORO', 120, UMBRALES), 'ORO');
  });
});

describe('Utilidades monetarias y de fechas', () => {
  test('round2 redondea a centavos', () => {
    assert.equal(round2(10.005), 10.01);
    assert.equal(round2(0.1 + 0.2), 0.3);
  });
  test('rangoFechas incluye el día final completo y descarta formatos inválidos', () => {
    const r = rangoFechas('2026-09-01', '2026-09-30');
    assert.equal(r.desde!.getHours(), 0);
    assert.equal(r.hasta!.getHours(), 23);
    assert.equal(r.hasta!.getMinutes(), 59);
    assert.deepEqual(rangoFechas('ayer', '2026/09/30'), { desde: undefined, hasta: undefined });
  });
  test('fechaLocal usa la fecha local (no UTC)', () => {
    assert.equal(fechaLocal(new Date(2026, 8, 30, 23, 30)), '2026-09-30');
  });
});

/** EntityManager simulado en memoria para probar el cierre de una venta. */
function managerSimulado(estado: { venta: any; detalles: any[]; productos: Record<string, any>; cliente?: any; config: Record<string, string> }) {
  const guardados: any[] = [];
  const m: any = {
    guardados,
    async findOne(entidad: any, opts: any) {
      const nombre = entidad.name;
      if (nombre === 'Venta') return estado.venta;
      if (nombre === 'Producto') return estado.productos[opts.where.id];
      if (nombre === 'Cliente') return estado.cliente;
      if (nombre === 'Configuracion') {
        const v = estado.config[opts.where.clave];
        return v === undefined ? null : { clave: opts.where.clave, valor: v };
      }
      return null;
    },
    async find() {
      return estado.detalles;
    },
    async update(entidad: any, _id: any, cambios: any) {
      if (entidad.name === 'Venta') Object.assign(estado.venta, cambios);
      if (entidad.name === 'Cliente' && estado.cliente) Object.assign(estado.cliente, cambios);
    },
    async save(_entidad: any, datos: any) {
      guardados.push(datos);
      return datos;
    },
  };
  return m;
}

describe('Cierre de venta (completarVenta)', () => {
  const base = (): any => ({
    venta: { id: 'v1', clienteId: 'c1', codigoComprobante: 'B-1', estado: 'PENDIENTE' } as any,
    detalles: [
      { productoId: 'p-puntos', subtotal: 200 },   // otorga puntos
      { productoId: 'p-normal', subtotal: 100 },   // no otorga puntos
    ],
    productos: { 'p-puntos': { otorgaPuntos: true }, 'p-normal': { otorgaPuntos: false } },
    cliente: { id: 'c1', puntosAcumulados: 480, nivelFidelizacion: 'BRONCE' },
    config: { impuesto_porcentaje: '0', bs_por_punto: '10' } as Record<string, string>,
  });

  test('otorga puntos solo por los productos designados', async () => {
    const e = base();
    await completarVenta(managerSimulado(e), 'v1', 0, 'u1');
    assert.equal(e.venta.estado, 'COMPLETADA');
    assert.equal(e.venta.total, 300);
    assert.equal(e.venta.puntosGenerados, 20); // 200 Bs / 10
  });

  test('registra saldo anterior/posterior y sube de nivel al cruzar el umbral', async () => {
    const e = base();
    const m = managerSimulado(e);
    await completarVenta(m, 'v1', 0, 'u1');
    const hist = m.guardados.find((g: any) => g.tipoOperacion === 'ACUMULACION');
    assert.equal(hist.saldoAnterior, 480);
    assert.equal(hist.saldoPosterior, 500);
    assert.equal(e.cliente.nivelFidelizacion, 'PLATA');
  });

  test('con descuento autorizado los puntos se calculan sobre lo efectivamente pagado', async () => {
    const e = base();
    await completarVenta(managerSimulado(e), 'v1', 60, 'u1'); // paga 240 de 300 (80 %)
    assert.equal(e.venta.descuento, 60);
    assert.equal(e.venta.total, 240);
    assert.equal(e.venta.puntosGenerados, 16); // 200 × 0,8 = 160 Bs → 16 puntos
  });

  test('el impuesto se toma de la configuración del negocio', async () => {
    const e = base();
    e.config.impuesto_porcentaje = '13';
    await completarVenta(managerSimulado(e), 'v1', 0, 'u1');
    assert.equal(e.venta.impuesto, 39);
    assert.equal(e.venta.total, 339);
  });

  test('el descuento nunca supera el subtotal', async () => {
    const e = base();
    await completarVenta(managerSimulado(e), 'v1', 999, 'u1');
    assert.equal(e.venta.descuento, 300);
    assert.equal(e.venta.total, 0);
  });

  test('una venta sin cliente no genera puntos', async () => {
    const e = base();
    e.venta.clienteId = undefined as any;
    await completarVenta(managerSimulado(e), 'v1', 0, 'u1');
    assert.equal(e.venta.puntosGenerados, 0);
  });
});

describe('Reversión de puntos', () => {
  test('nunca deja saldo negativo', async () => {
    const e: any = { venta: {}, detalles: [], productos: {}, cliente: { id: 'c1', puntosAcumulados: 5 }, config: {} };
    const m = managerSimulado(e);
    const revertidos = await revertirPuntos(m, 'c1', 20, 'v1', 'Anulación', 'u1');
    assert.equal(revertidos, 5);
    assert.equal(e.cliente.puntosAcumulados, 0);
    assert.equal(m.guardados[0].puntos, -5);
  });
});

describe('Control de acceso por rol (RolesGuard)', () => {
  const contexto = (rol: string | undefined, roles?: string[]) => {
    const reflector = { getAllAndOverride: () => roles } as unknown as Reflector;
    const ctx = {
      getHandler: () => null,
      getClass: () => null,
      switchToHttp: () => ({ getRequest: () => ({ user: rol ? { rol: { nombre: rol } } : undefined }) }),
    } as unknown as ExecutionContext;
    return { guard: new RolesGuard(reflector), ctx };
  };
  test('sin roles declarados basta estar autenticado', () => {
    const { guard, ctx } = contexto('Vendedor', undefined);
    assert.equal(guard.canActivate(ctx), true);
  });
  test('permite al rol habilitado', () => {
    const { guard, ctx } = contexto('Cajero', ['Administrador', 'Cajero']);
    assert.equal(guard.canActivate(ctx), true);
  });
  test('rechaza con 403 al rol no habilitado', () => {
    const { guard, ctx } = contexto('Vendedor', ['Administrador', 'Cajero']);
    assert.throws(() => guard.canActivate(ctx), ForbiddenException);
  });
});

describe('Traducción de errores de base de datos', () => {
  const ejecutar = (code: string, detail = '') => {
    let status = 0;
    let body: any;
    const res = { status: (s: number) => ({ json: (b: any) => { status = s; body = b; } }) };
    const host: any = { switchToHttp: () => ({ getResponse: () => res }) };
    const err = new QueryFailedError('SELECT 1', [], Object.assign(new Error('x'), { code, detail }));
    new QueryFailedFilter().catch(err, host);
    return { status, body };
  };
  test('identificador mal formado -> 400', () => {
    assert.equal(ejecutar('22P02').status, 400);
  });
  test('valor duplicado -> 409 indicando el campo', () => {
    const r = ejecutar('23505', 'Key (sku)=(FLOR-001) already exists.');
    assert.equal(r.status, 409);
    assert.match(r.body.message, /sku/);
  });
  test('clave foránea inexistente -> 400', () => {
    assert.equal(ejecutar('23503').status, 400);
  });
});
