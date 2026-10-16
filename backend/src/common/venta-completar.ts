import { BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Venta } from '../entities/venta.entity';
import { DetalleVenta } from '../entities/detalle-venta.entity';
import { Producto } from '../entities/producto.entity';
import { Cliente } from '../entities/cliente.entity';
import { FidelizacionHistorial } from '../entities/fidelizacion-historial.entity';
import { leerConfigNumero, nivelTrasAcumular, round2, umbralesNivel } from './negocio.util';

/**
 * Cierra una venta dentro de una transacción ya abierta:
 *  1. aplica el descuento autorizado (si lo hay) sobre el subtotal,
 *  2. calcula impuesto y total con la configuración del negocio,
 *  3. otorga puntos SOLO por los productos designados (otorga_puntos),
 *     proporcionales al monto efectivamente pagado, y actualiza el nivel,
 *  4. deja la venta en estado COMPLETADA.
 * Lo usan el registro de ventas y la respuesta a una autorización de descuento.
 */
export async function completarVenta(
  manager: EntityManager,
  ventaId: string,
  descuento: number,
  usuarioId: string,
): Promise<void> {
  const venta = await manager.findOne(Venta, { where: { id: ventaId }, lock: { mode: 'pessimistic_write' } });
  if (!venta) throw new BadRequestException('Venta no encontrada');

  const detalles = await manager.find(DetalleVenta, { where: { ventaId } });
  const subtotal = round2(detalles.reduce((s, d) => s + Number(d.subtotal), 0));
  const desc = round2(Math.min(Math.max(descuento, 0), subtotal));
  const base = round2(subtotal - desc);

  const pctImpuesto = await leerConfigNumero(manager, 'impuesto_porcentaje', 0);
  const impuesto = round2((base * pctImpuesto) / 100);
  const total = round2(base + impuesto);

  // Monto que genera puntos: solo productos designados, con el descuento prorrateado.
  let puntosGenerados = 0;
  if (venta.clienteId) {
    let montoPunteable = 0;
    for (const d of detalles) {
      const prod = await manager.findOne(Producto, { where: { id: d.productoId }, withDeleted: true });
      if (prod?.otorgaPuntos) montoPunteable += Number(d.subtotal);
    }
    if (subtotal > 0) montoPunteable = montoPunteable * (base / subtotal);
    const bsPorPunto = await leerConfigNumero(manager, 'bs_por_punto', 10);
    puntosGenerados = bsPorPunto > 0 ? Math.floor(round2(montoPunteable) / bsPorPunto) : 0;
  }

  await manager.update(Venta, ventaId, {
    subtotal,
    descuento: desc,
    impuesto,
    total,
    puntosGenerados,
    estado: 'COMPLETADA',
  });

  if (venta.clienteId && puntosGenerados > 0) {
    const cliente = await manager.findOne(Cliente, {
      where: { id: venta.clienteId },
      lock: { mode: 'pessimistic_write' },
    });
    if (cliente) {
      const saldoAnterior = cliente.puntosAcumulados;
      const saldoPosterior = saldoAnterior + puntosGenerados;
      const umbrales = await umbralesNivel(manager);
      await manager.update(Cliente, cliente.id, {
        puntosAcumulados: saldoPosterior,
        nivelFidelizacion: nivelTrasAcumular(cliente.nivelFidelizacion, saldoPosterior, umbrales),
      });
      await manager.save(FidelizacionHistorial, {
        clienteId: cliente.id,
        ventaId,
        tipoOperacion: 'ACUMULACION',
        puntos: puntosGenerados,
        saldoAnterior,
        saldoPosterior,
        descripcion: `Venta ${venta.codigoComprobante}`,
        createdById: usuarioId,
      });
    }
  }
}

/**
 * Revierte puntos otorgados (anulación o devolución) sin dejar saldo negativo
 * y registra el AJUSTE en el historial. Devuelve los puntos efectivamente revertidos.
 */
export async function revertirPuntos(
  manager: EntityManager,
  clienteId: string,
  puntos: number,
  ventaId: string,
  descripcion: string,
  usuarioId: string,
): Promise<number> {
  if (!clienteId || puntos <= 0) return 0;
  const cliente = await manager.findOne(Cliente, { where: { id: clienteId }, lock: { mode: 'pessimistic_write' } });
  if (!cliente) return 0;
  const saldoAnterior = cliente.puntosAcumulados;
  const saldoPosterior = Math.max(0, saldoAnterior - puntos);
  const revertidos = saldoAnterior - saldoPosterior;
  if (revertidos <= 0) return 0;
  await manager.update(Cliente, clienteId, { puntosAcumulados: saldoPosterior });
  await manager.save(FidelizacionHistorial, {
    clienteId,
    ventaId,
    tipoOperacion: 'AJUSTE',
    puntos: -revertidos,
    saldoAnterior,
    saldoPosterior,
    descripcion,
    createdById: usuarioId,
  });
  return revertidos;
}
