import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Caja } from '../../entities/caja.entity';
import { AbrirCajaDto } from '../../dto/abrir-caja.dto';
import { CerrarCajaDto } from '../../dto/cerrar-caja.dto';
import { rangoFechas, round2 } from '../../common/negocio.util';

/** Movimientos calculados de una caja (no se escriben a mano: se derivan de las transacciones). */
export interface ResumenCaja {
  totalIngresos: number;      // ventas completadas en EFECTIVO durante el turno
  totalEgresos: number;       // devoluciones (reembolsos) registradas durante el turno
  ventasOtrosMedios: number;  // QR, tarjeta y transferencia (no ingresan al cajón)
  cantidadVentas: number;
  saldoEsperado: number;      // monto inicial + ingresos − egresos
  diferencia: number | null;  // monto contado al cierre − saldo esperado
}

@Injectable()
export class CajaService {
  constructor(@InjectRepository(Caja) private readonly repo: Repository<Caja>) {}

  /** Suma las ventas y devoluciones del intervalo del turno de caja. */
  private async calcular(caja: Caja): Promise<ResumenCaja> {
    const desde = caja.fechaApertura;
    const hasta = caja.fechaCierre ?? new Date();
    const [v] = await this.repo.query(
      `SELECT
         COALESCE(SUM(total) FILTER (WHERE metodo_pago = 'EFECTIVO'), 0)  AS efectivo,
         COALESCE(SUM(total) FILTER (WHERE metodo_pago <> 'EFECTIVO'), 0) AS otros,
         COUNT(*) AS cantidad
       FROM inventario.ventas
       WHERE estado = 'COMPLETADA' AND deleted_at IS NULL
         AND created_at >= $1 AND created_at <= $2`,
      [desde, hasta],
    );
    const [d] = await this.repo.query(
      `SELECT COALESCE(SUM(total), 0) AS total
       FROM inventario.devoluciones
       WHERE estado = 'COMPLETADA' AND deleted_at IS NULL
         AND created_at >= $1 AND created_at <= $2`,
      [desde, hasta],
    );
    const totalIngresos = round2(Number(v.efectivo));
    const totalEgresos = round2(Number(d.total));
    const saldoEsperado = round2(Number(caja.montoInicial) + totalIngresos - totalEgresos);
    return {
      totalIngresos,
      totalEgresos,
      ventasOtrosMedios: round2(Number(v.otros)),
      cantidadVentas: Number(v.cantidad),
      saldoEsperado,
      diferencia: caja.montoFinal != null ? round2(Number(caja.montoFinal) - saldoEsperado) : null,
    };
  }

  private async conResumen(caja: Caja) {
    return Object.assign(caja, await this.calcular(caja));
  }

  async findAll(filters?: { estado?: string; desde?: string; hasta?: string }) {
    const where: any = { deletedAt: IsNull() };
    if (filters?.estado) where.estado = filters.estado;
    const r = rangoFechas(filters?.desde, filters?.hasta);
    if (r.desde && r.hasta) where.createdAt = Between(r.desde, r.hasta);
    else if (r.desde) where.createdAt = MoreThanOrEqual(r.desde);
    else if (r.hasta) where.createdAt = LessThanOrEqual(r.hasta);
    const cajas = await this.repo.find({
      where,
      relations: ['usuarioApertura', 'usuarioCierre'],
      order: { createdAt: 'DESC' },
    });
    return Promise.all(cajas.map((c) => this.conResumen(c)));
  }

  async findOne(id: string) {
    const caja = await this.repo.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['usuarioApertura', 'usuarioCierre'],
    });
    if (!caja) throw new NotFoundException('Caja no encontrada');
    return this.conResumen(caja);
  }

  async findAbierta() {
    const caja = await this.repo.findOne({
      where: { estado: 'ABIERTA', deletedAt: IsNull() },
      relations: ['usuarioApertura'],
    });
    return caja ? this.conResumen(caja) : null;
  }

  async abrir(dto: AbrirCajaDto, usuarioId: string) {
    const abierta = await this.repo.findOne({ where: { estado: 'ABIERTA', deletedAt: IsNull() } });
    if (abierta) {
      throw new BadRequestException('Ya existe una caja abierta. Ciérrela antes de abrir una nueva.');
    }
    const caja = this.repo.create({
      fechaApertura: new Date(),
      montoInicial: dto.montoInicial,
      totalIngresos: 0,
      totalEgresos: 0,
      estado: 'ABIERTA',
      usuarioAperturaId: usuarioId,
      observaciones: dto.observaciones,
    });
    const saved = await this.repo.save(caja);
    return this.findOne(saved.id);
  }

  /** Cierra el turno: congela ingresos y egresos calculados y registra el monto contado. */
  async cerrar(id: string, dto: CerrarCajaDto, usuarioId: string) {
    const caja = await this.repo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!caja) throw new NotFoundException('Caja no encontrada');
    if (caja.estado !== 'ABIERTA') {
      throw new BadRequestException('La caja no está abierta');
    }

    caja.fechaCierre = new Date();
    const resumen = await this.calcular(caja);
    caja.totalIngresos = resumen.totalIngresos;
    caja.totalEgresos = resumen.totalEgresos;
    caja.montoFinal = dto.montoFinal;
    caja.estado = 'CERRADA';
    caja.usuarioCierreId = usuarioId;
    caja.observaciones = dto.observaciones || caja.observaciones;
    await this.repo.save(caja);
    return this.findOne(id);
  }
}
