import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull, MoreThanOrEqual, LessThanOrEqual, Between } from 'typeorm';
import { Venta } from '../../entities/venta.entity';
import { DetalleVenta } from '../../entities/detalle-venta.entity';
import { Producto } from '../../entities/producto.entity';
import { Kardex } from '../../entities/kardex.entity';
import { Autorizacion } from '../../entities/autorizacion.entity';
import { CrearVentaDto } from '../../dto/crear-venta.dto';
import { completarVenta, revertirPuntos } from '../../common/venta-completar';
import { fechaLocal, rangoFechas, round2 } from '../../common/negocio.util';
import { AutorizacionesGateway } from '../autorizaciones/autorizaciones.gateway';

/** Usuario autenticado (tomado del token JWT). */
export interface UsuarioActual {
  id: string;
  rol?: { nombre?: string };
}

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta) private readonly ventaRepo: Repository<Venta>,
    private readonly dataSource: DataSource,
    private readonly gateway: AutorizacionesGateway,
  ) {}

  async findAll(filters?: { estado?: string; metodoPago?: string; clienteId?: string; desde?: string; hasta?: string }) {
    const where: any = { deletedAt: IsNull() };
    if (filters?.estado) where.estado = filters.estado;
    if (filters?.metodoPago) where.metodoPago = filters.metodoPago;
    if (filters?.clienteId) where.clienteId = filters.clienteId;
    const r = rangoFechas(filters?.desde, filters?.hasta);
    if (r.desde && r.hasta) where.createdAt = Between(r.desde, r.hasta);
    else if (r.desde) where.createdAt = MoreThanOrEqual(r.desde);
    else if (r.hasta) where.createdAt = LessThanOrEqual(r.hasta);
    return this.ventaRepo.find({
      where,
      relations: ['cliente', 'usuario', 'detalles', 'detalles.producto', 'autorizacion'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const venta = await this.ventaRepo.findOne({
      where: { id },
      relations: ['cliente', 'usuario', 'detalles', 'detalles.producto', 'autorizacion', 'autorizacion.aprobador'],
    });
    if (!venta) throw new NotFoundException('Venta no encontrada');
    return venta;
  }

  /**
   * Registra una venta como transacción atómica (inventario perpetuo):
   *  - el precio unitario se toma del catálogo (no del cliente HTTP),
   *  - cada línea bloquea el producto (bloqueo pesimista), valida stock,
   *    descuenta existencias y registra la SALIDA en el Kardex,
   *  - si el vendedor negocia un precio menor (precioSolicitado), la venta queda
   *    PENDIENTE y se crea una solicitud de autorización que el administrador
   *    recibe en tiempo real por WebSocket. Si quien vende es el administrador,
   *    el descuento se aplica directamente y queda registrado como aprobado.
   */
  async create(dto: CrearVentaDto, usuario: UsuarioActual) {
    const esAdmin = usuario.rol?.nombre === 'Administrador';
    const solicitaDescuento = dto.precioSolicitado !== undefined && dto.precioSolicitado !== null;
    if (solicitaDescuento && (!dto.motivoDescuento || dto.motivoDescuento.trim().length < 5)) {
      throw new BadRequestException('Indique el motivo del descuento (mínimo 5 caracteres).');
    }

    // Agrupar líneas del mismo producto para validar el stock sobre la cantidad total.
    const lineas = new Map<string, number>();
    for (const d of dto.detalles) lineas.set(d.productoId, (lineas.get(d.productoId) || 0) + d.cantidad);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    let autorizacionPendiente: Autorizacion | null = null;
    let ventaId: string;

    try {
      const m = queryRunner.manager;
      const savedVenta = await m.save(
        m.create(Venta, {
          codigoComprobante: dto.codigoComprobante,
          tipoComprobante: dto.tipoComprobante || 'NOTA_VENTA',
          clienteId: dto.clienteId,
          usuarioId: usuario.id,
          metodoPago: dto.metodoPago || 'EFECTIVO',
          subtotal: 0,
          descuento: 0,
          impuesto: 0,
          total: 0,
          puntosRedimidos: 0,
          estado: 'PENDIENTE',
        }),
      );
      ventaId = savedVenta.id;

      let subtotal = 0;
      for (const [productoId, cantidad] of lineas) {
        // Bloqueo pesimista: evita la sobreventa cuando dos ventas tocan el mismo producto.
        const producto = await m.findOne(Producto, {
          where: { id: productoId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!producto) throw new NotFoundException('Uno de los productos no existe o fue eliminado.');
        if (!producto.esActivo) throw new BadRequestException(`El producto ${producto.nombre} está inactivo.`);
        if (producto.stockActual < cantidad) {
          throw new BadRequestException(
            `Stock insuficiente para ${producto.nombre} (disponible: ${producto.stockActual}, solicitado: ${cantidad})`,
          );
        }

        const precioUnitario = Number(producto.precioBase);
        const subtotalLinea = round2(precioUnitario * cantidad);
        subtotal += subtotalLinea;

        await m.save(DetalleVenta, {
          ventaId,
          productoId,
          cantidad,
          precioUnitario,
          descuentoAplicado: 0,
          subtotal: subtotalLinea,
          requiereAutorizacion: solicitaDescuento && !esAdmin,
        });

        const stockAnterior = producto.stockActual;
        const stockNuevo = stockAnterior - cantidad;
        await m.update(Producto, productoId, { stockActual: stockNuevo });
        await m.save(Kardex, {
          productoId,
          tipoMovimiento: 'SALIDA',
          cantidad,
          costoUnitario: producto.costoPromedio ?? undefined,
          stockAnterior,
          stockNuevo,
          referencia: 'VENTA',
          referenciaId: ventaId,
          observacion: `Venta ${savedVenta.codigoComprobante}`,
          usuarioId: usuario.id,
        });
      }
      subtotal = round2(subtotal);

      if (solicitaDescuento) {
        const precio = round2(Number(dto.precioSolicitado));
        if (!(precio > 0 && precio < subtotal)) {
          throw new BadRequestException(
            `El precio negociado debe ser mayor a 0 y menor al subtotal (Bs ${subtotal.toFixed(2)}).`,
          );
        }
        const autorizacion = await m.save(
          m.create(Autorizacion, {
            ventaId,
            solicitanteId: usuario.id,
            tipo: 'DESCUENTO_ESPECIAL',
            estado: esAdmin ? 'APROBADA' : 'PENDIENTE',
            precioSolicitado: precio,
            precioAprobado: esAdmin ? precio : undefined,
            aprobadorId: esAdmin ? usuario.id : undefined,
            respondidaEn: esAdmin ? new Date() : undefined,
            motivoSolicitud: dto.motivoDescuento!.trim(),
            motivoRespuesta: esAdmin ? 'Descuento aplicado por el administrador' : undefined,
            expiraEn: new Date(Date.now() + 5 * 60 * 1000),
          }),
        );
        await m.update(Venta, ventaId, { autorizacionId: autorizacion.id, subtotal, total: subtotal });

        if (esAdmin) {
          await completarVenta(m, ventaId, subtotal - precio, usuario.id);
        } else {
          autorizacionPendiente = autorizacion;
        }
      } else {
        await completarVenta(m, ventaId, 0, usuario.id);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    const venta = await this.findOne(ventaId);
    if (autorizacionPendiente) {
      // Notificación en tiempo real al administrador (WebSocket / Socket.IO).
      this.gateway.notificarPendiente({
        autorizacionId: autorizacionPendiente.id,
        ventaId: venta.id,
        codigoComprobante: venta.codigoComprobante,
        subtotal: Number(venta.subtotal),
        precioSolicitado: Number(autorizacionPendiente.precioSolicitado),
        motivo: autorizacionPendiente.motivoSolicitud,
        solicitante: `${venta.usuario?.nombre ?? ''} ${venta.usuario?.apellido ?? ''}`.trim(),
      });
    }
    return venta;
  }

  /** Ventas completadas de los últimos 7 días agrupadas por fecha local. */
  async getDailySales() {
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - 6);
    inicio.setHours(0, 0, 0, 0);

    const ventas = await this.ventaRepo.find({
      where: { deletedAt: IsNull(), estado: 'COMPLETADA', createdAt: MoreThanOrEqual(inicio) },
      order: { createdAt: 'ASC' },
    });

    const dailyMap: Record<string, { fecha: string; total: number; cantidad: number }> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(inicio);
      d.setDate(d.getDate() + i);
      const key = fechaLocal(d);
      dailyMap[key] = { fecha: key, total: 0, cantidad: 0 };
    }
    for (const v of ventas) {
      const key = fechaLocal(new Date(v.createdAt));
      if (dailyMap[key]) {
        dailyMap[key].total = round2(dailyMap[key].total + Number(v.total));
        dailyMap[key].cantidad += 1;
      }
    }
    return Object.values(dailyMap).sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  /**
   * Anula una venta COMPLETADA (o cancela una PENDIENTE de autorización):
   * repone el stock con una ENTRADA en el Kardex y revierte los puntos otorgados.
   * No se permite si la venta ya tuvo devoluciones (evita reponer stock dos veces).
   */
  async anular(id: string, motivo: string, usuarioId: string) {
    if (!motivo || motivo.trim().length < 3) {
      throw new BadRequestException('Indique el motivo de la anulación.');
    }
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    let autorizacionCancelada: string | null = null;

    try {
      const m = queryRunner.manager;
      const venta = await m.findOne(Venta, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!venta) throw new NotFoundException('Venta no encontrada');
      if (venta.estado !== 'COMPLETADA' && venta.estado !== 'PENDIENTE') {
        throw new BadRequestException('Solo se pueden anular ventas completadas o pendientes.');
      }
      if (venta.tieneDevolucion) {
        throw new BadRequestException('La venta tiene devoluciones registradas; no puede anularse.');
      }
      const detalles = await m.find(DetalleVenta, { where: { ventaId: id } });

      for (const det of detalles) {
        const producto = await m.findOne(Producto, {
          where: { id: det.productoId },
          lock: { mode: 'pessimistic_write' },
          withDeleted: true,
        });
        if (!producto) continue;
        const stockAnterior = producto.stockActual;
        const stockNuevo = stockAnterior + det.cantidad;
        await m.update(Producto, det.productoId, { stockActual: stockNuevo });
        await m.save(Kardex, {
          productoId: det.productoId,
          tipoMovimiento: 'ENTRADA',
          cantidad: det.cantidad,
          costoUnitario: producto.costoPromedio ?? undefined,
          stockAnterior,
          stockNuevo,
          referencia: 'ANULACION',
          referenciaId: venta.id,
          observacion: `Anulación venta ${venta.codigoComprobante}: ${motivo.trim()}`,
          usuarioId,
        });
      }

      if (venta.clienteId && venta.puntosGenerados > 0) {
        await revertirPuntos(m, venta.clienteId, venta.puntosGenerados, venta.id, `Anulación ${venta.codigoComprobante}`, usuarioId);
      }

      // Si estaba esperando autorización, la solicitud deja de estar pendiente.
      if (venta.estado === 'PENDIENTE' && venta.autorizacionId) {
        await m.update(Autorizacion, { id: venta.autorizacionId, estado: 'PENDIENTE' }, {
          estado: 'EXPIRADA',
          motivoRespuesta: 'Venta cancelada antes de la respuesta',
          respondidaEn: new Date(),
        });
        autorizacionCancelada = venta.autorizacionId;
      }

      await m.update(Venta, id, { estado: 'ANULADA', motivoAnulacion: motivo.trim() });
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    if (autorizacionCancelada) this.gateway.notificarRespondida({ autorizacionId: autorizacionCancelada, ventaId: id, estado: 'EXPIRADA' });
    return this.findOne(id);
  }
}
