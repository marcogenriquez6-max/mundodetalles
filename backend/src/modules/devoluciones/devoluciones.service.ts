import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Between, MoreThanOrEqual, LessThanOrEqual, DataSource } from 'typeorm';
import { Devolucion } from '../../entities/devolucion.entity';
import { DetalleDevolucion } from '../../entities/detalle-devolucion.entity';
import { DetalleVenta } from '../../entities/detalle-venta.entity';
import { Producto } from '../../entities/producto.entity';
import { Kardex } from '../../entities/kardex.entity';
import { Venta } from '../../entities/venta.entity';
import { CrearDevolucionDto } from '../../dto/crear-devolucion.dto';
import { revertirPuntos } from '../../common/venta-completar';
import { rangoFechas, round2 } from '../../common/negocio.util';

@Injectable()
export class DevolucionesService {
  constructor(
    @InjectRepository(Devolucion) private readonly devolucionRepo: Repository<Devolucion>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(filters?: { estado?: string; ventaId?: string; desde?: string; hasta?: string }) {
    const where: any = { deletedAt: IsNull() };
    if (filters?.estado) where.estado = filters.estado;
    if (filters?.ventaId) where.ventaId = filters.ventaId;
    const r = rangoFechas(filters?.desde, filters?.hasta);
    if (r.desde && r.hasta) where.createdAt = Between(r.desde, r.hasta);
    else if (r.desde) where.createdAt = MoreThanOrEqual(r.desde);
    else if (r.hasta) where.createdAt = LessThanOrEqual(r.hasta);
    return this.devolucionRepo.find({
      where,
      relations: ['venta', 'usuario', 'detalles', 'detalles.producto'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const devolucion = await this.devolucionRepo.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['venta', 'usuario', 'detalles', 'detalles.producto'],
    });
    if (!devolucion) throw new NotFoundException('Devolución no encontrada');
    return devolucion;
  }

  /**
   * Registra una devolución asociada a la venta original, en una sola transacción:
   *  - la venta debe estar COMPLETADA y contener los productos devueltos,
   *  - no se puede devolver más de lo vendido (descontando devoluciones previas),
   *  - el monto se valoriza al precio efectivamente cobrado (con descuento e impuesto),
   *  - repone el stock con una ENTRADA en el Kardex,
   *  - revierte los puntos de fidelización generados por lo devuelto,
   *  - marca la venta original (tiene_devolucion).
   */
  async create(dto: CrearDevolucionDto, usuarioId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    let devolucionId: string;

    try {
      const m = queryRunner.manager;
      const venta = await m.findOne(Venta, { where: { id: dto.ventaId }, lock: { mode: 'pessimistic_write' } });
      if (!venta) throw new NotFoundException('Venta no encontrada');
      if (venta.estado !== 'COMPLETADA') {
        throw new BadRequestException('Solo se pueden registrar devoluciones sobre ventas completadas.');
      }

      const detallesVenta = await m.find(DetalleVenta, { where: { ventaId: venta.id } });
      const vendido = new Map<string, { cantidad: number; subtotal: number }>();
      for (const d of detallesVenta) {
        const prev = vendido.get(d.productoId) || { cantidad: 0, subtotal: 0 };
        vendido.set(d.productoId, { cantidad: prev.cantidad + d.cantidad, subtotal: prev.subtotal + Number(d.subtotal) });
      }

      // Cantidades ya devueltas anteriormente de esta misma venta.
      const previas: { producto_id: string; devuelto: string }[] = await m.query(
        `SELECT dd.producto_id, SUM(dd.cantidad) AS devuelto
           FROM inventario.detalle_devolucion dd
           JOIN inventario.devoluciones d ON d.id = dd.devolucion_id
          WHERE d.venta_id = $1 AND d.estado = 'COMPLETADA' AND d.deleted_at IS NULL
          GROUP BY dd.producto_id`,
        [venta.id],
      );
      const yaDevuelto = new Map(previas.map((p) => [p.producto_id, Number(p.devuelto)]));

      // Factor del precio efectivamente cobrado (descuento autorizado e impuesto).
      const subtotalVenta = Number(venta.subtotal);
      const factorNeto = subtotalVenta > 0 ? (subtotalVenta - Number(venta.descuento)) / subtotalVenta : 1;
      const factorImpuesto = subtotalVenta - Number(venta.descuento) > 0
        ? Number(venta.impuesto) / (subtotalVenta - Number(venta.descuento))
        : 0;

      const solicitadas = new Map<string, number>();
      for (const d of dto.detalles) solicitadas.set(d.productoId, (solicitadas.get(d.productoId) || 0) + d.cantidad);

      const lineas: { productoId: string; cantidad: number; precioUnitario: number; subtotal: number }[] = [];
      for (const [productoId, cantidad] of solicitadas) {
        const v = vendido.get(productoId);
        if (!v) throw new BadRequestException('Uno de los productos no pertenece a la venta seleccionada.');
        const disponible = v.cantidad - (yaDevuelto.get(productoId) || 0);
        if (cantidad > disponible) {
          throw new BadRequestException(
            `No se puede devolver ${cantidad} unidad(es): de este producto quedan ${disponible} por devolver.`,
          );
        }
        const precioUnitario = round2((v.subtotal / v.cantidad) * factorNeto);
        lineas.push({ productoId, cantidad, precioUnitario, subtotal: round2(precioUnitario * cantidad) });
      }

      const subtotal = round2(lineas.reduce((s, l) => s + l.subtotal, 0));
      const impuesto = round2(subtotal * factorImpuesto);
      const saved = await m.save(
        m.create(Devolucion, {
          ventaId: venta.id,
          codigo: dto.codigo,
          motivo: dto.motivo,
          subtotal,
          impuesto,
          total: round2(subtotal + impuesto),
          estado: 'COMPLETADA',
          usuarioId,
        }),
      );
      devolucionId = saved.id;

      for (const l of lineas) {
        await m.save(DetalleDevolucion, {
          devolucionId: saved.id,
          productoId: l.productoId,
          cantidad: l.cantidad,
          precioUnitario: l.precioUnitario,
          subtotal: l.subtotal,
        });

        const producto = await m.findOne(Producto, {
          where: { id: l.productoId },
          lock: { mode: 'pessimistic_write' },
          withDeleted: true,
        });
        if (!producto) throw new NotFoundException('Producto no encontrado');
        const stockAnterior = producto.stockActual;
        const stockNuevo = stockAnterior + l.cantidad;
        await m.update(Producto, producto.id, { stockActual: stockNuevo });
        await m.save(Kardex, {
          productoId: producto.id,
          tipoMovimiento: 'ENTRADA',
          cantidad: l.cantidad,
          costoUnitario: producto.costoPromedio ?? undefined,
          stockAnterior,
          stockNuevo,
          referencia: 'DEVOLUCION',
          referenciaId: saved.id,
          observacion: `Devolución ${saved.codigo}: ${dto.motivo}`,
          usuarioId,
        });
      }

      // Revertir los puntos correspondientes a lo devuelto (proporcional al monto).
      if (venta.clienteId && venta.puntosGenerados > 0) {
        const baseVenta = subtotalVenta - Number(venta.descuento);
        const puntos = baseVenta > 0 ? Math.floor((venta.puntosGenerados * subtotal) / baseVenta) : 0;
        await revertirPuntos(m, venta.clienteId, puntos, venta.id, `Devolución ${saved.codigo}`, usuarioId);
      }

      // "Sello" en la venta original: queda marcada como que tuvo devolución (RF-11).
      await m.update(Venta, venta.id, { tieneDevolucion: true });
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    return this.findOne(devolucionId);
  }
}
