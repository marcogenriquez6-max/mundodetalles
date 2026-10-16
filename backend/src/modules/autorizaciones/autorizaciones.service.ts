import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Autorizacion } from '../../entities/autorizacion.entity';
import { Venta } from '../../entities/venta.entity';
import { SolicitarAutorizacionDto } from '../../dto/solicitar-autorizacion.dto';
import { ResponderAutorizacionDto } from '../../dto/responder-autorizacion.dto';
import { completarVenta } from '../../common/venta-completar';
import { round2 } from '../../common/negocio.util';
import { AutorizacionesGateway } from './autorizaciones.gateway';

@Injectable()
export class AutorizacionesService {
  constructor(
    @InjectRepository(Autorizacion) private readonly repo: Repository<Autorizacion>,
    private readonly dataSource: DataSource,
    private readonly gateway: AutorizacionesGateway,
  ) {}

  async findAll(filters?: { estado?: string; tipo?: string }) {
    const where: any = {};
    if (filters?.estado) where.estado = filters.estado;
    if (filters?.tipo) where.tipo = filters.tipo;
    return this.repo.find({
      where,
      relations: ['venta', 'venta.detalles', 'venta.detalles.producto', 'solicitante', 'aprobador'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const auth = await this.repo.findOne({
      where: { id },
      relations: ['venta', 'venta.detalles', 'venta.detalles.producto', 'solicitante', 'aprobador'],
    });
    if (!auth) throw new NotFoundException('Autorización no encontrada');
    return auth;
  }

  /** Solicitudes que esperan respuesta (persisten aunque el administrador no esté conectado). */
  async pendientes() {
    return this.repo.find({
      where: { estado: 'PENDIENTE' },
      relations: ['venta', 'venta.cliente', 'venta.detalles', 'venta.detalles.producto', 'solicitante'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Nueva solicitud sobre una venta PENDIENTE que no tenga otra solicitud abierta
   * (p. ej. para volver a pedir un precio). El solicitante se toma del token.
   */
  async solicitar(dto: SolicitarAutorizacionDto, solicitanteId: string) {
    const venta = await this.dataSource.manager.findOne(Venta, { where: { id: dto.ventaId } });
    if (!venta) throw new NotFoundException('Venta no encontrada');
    if (venta.estado !== 'PENDIENTE') {
      throw new BadRequestException('Solo se puede solicitar autorización para una venta pendiente.');
    }
    const abierta = await this.repo.findOne({ where: { ventaId: dto.ventaId, estado: 'PENDIENTE' } });
    if (abierta) throw new BadRequestException('La venta ya tiene una solicitud pendiente.');
    if (dto.precioSolicitado !== undefined && !(dto.precioSolicitado > 0 && dto.precioSolicitado < Number(venta.subtotal))) {
      throw new BadRequestException('El precio solicitado debe ser mayor a 0 y menor al subtotal de la venta.');
    }

    const auth = await this.repo.save(
      this.repo.create({
        ventaId: dto.ventaId,
        detalleVentaId: dto.detalleVentaId,
        solicitanteId,
        tipo: dto.tipo,
        precioSolicitado: dto.precioSolicitado,
        motivoSolicitud: dto.motivoSolicitud,
        expiraEn: new Date(Date.now() + 5 * 60 * 1000),
      }),
    );
    await this.dataSource.manager.update(Venta, venta.id, { autorizacionId: auth.id });
    this.gateway.notificarPendiente({
      autorizacionId: auth.id,
      ventaId: venta.id,
      codigoComprobante: venta.codigoComprobante,
      subtotal: Number(venta.subtotal),
      precioSolicitado: auth.precioSolicitado != null ? Number(auth.precioSolicitado) : null,
      motivo: auth.motivoSolicitud,
    });
    return auth;
  }

  /**
   * El administrador aprueba (con el precio solicitado o uno modificado) o
   * rechaza la solicitud. En los tres casos la venta se completa en la misma
   * transacción: con el precio autorizado, o al precio de lista si se rechaza.
   */
  async responder(dto: ResponderAutorizacionDto, aprobadorId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    let ventaId: string;
    let precioFinal: number | null = null;

    try {
      const m = queryRunner.manager;
      const auth = await m.findOne(Autorizacion, {
        where: { id: dto.autorizacionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!auth) throw new NotFoundException('Autorización no encontrada');
      if (auth.estado !== 'PENDIENTE') {
        throw new BadRequestException('La autorización ya fue respondida o cancelada.');
      }
      const venta = await m.findOne(Venta, { where: { id: auth.ventaId } });
      if (!venta || venta.estado !== 'PENDIENTE') {
        throw new BadRequestException('La venta asociada ya no está pendiente.');
      }
      ventaId = venta.id;
      const subtotal = Number(venta.subtotal);

      let descuento = 0;
      if (dto.estado === 'APROBADA') {
        const precio = round2(Number(dto.precioAprobado ?? auth.precioSolicitado));
        if (!(precio > 0 && precio <= subtotal)) {
          throw new BadRequestException(`El precio aprobado debe ser mayor a 0 y no superar Bs ${subtotal.toFixed(2)}.`);
        }
        descuento = round2(subtotal - precio);
        precioFinal = precio;
      }

      await m.update(Autorizacion, auth.id, {
        estado: dto.estado,
        aprobadorId,
        motivoRespuesta: dto.motivoRespuesta,
        precioAprobado: precioFinal ?? undefined,
        respondidaEn: new Date(),
      });
      await completarVenta(m, venta.id, descuento, aprobadorId);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    const respuesta = await this.findOne(dto.autorizacionId);
    this.gateway.notificarRespondida({
      autorizacionId: respuesta.id,
      ventaId,
      estado: respuesta.estado,
      precioAprobado: precioFinal,
      motivoRespuesta: respuesta.motivoRespuesta ?? null,
    });
    return respuesta;
  }
}
