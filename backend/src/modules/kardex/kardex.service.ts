import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Between, MoreThanOrEqual, LessThanOrEqual, FindOptionsWhere, DataSource } from 'typeorm';
import { Kardex } from '../../entities/kardex.entity';
import { Producto } from '../../entities/producto.entity';
import { CrearKardexDto } from '../../dto/crear-kardex.dto';
import { rangoFechas, round2 } from '../../common/negocio.util';

@Injectable()
export class KardexService {
  constructor(
    @InjectRepository(Kardex) private readonly repo: Repository<Kardex>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(filters?: { productoId?: string; tipoMovimiento?: string; fechaInicio?: string; fechaFin?: string }) {
    const where: FindOptionsWhere<Kardex> = { deletedAt: IsNull() };
    if (filters?.productoId) where.productoId = filters.productoId;
    if (filters?.tipoMovimiento) where.tipoMovimiento = filters.tipoMovimiento;
    // Rango de fechas inclusivo en hora local (desde 00:00 hasta 23:59 del día final).
    const r = rangoFechas(filters?.fechaInicio, filters?.fechaFin);
    if (r.desde && r.hasta) where.createdAt = Between(r.desde, r.hasta);
    else if (r.desde) where.createdAt = MoreThanOrEqual(r.desde);
    else if (r.hasta) where.createdAt = LessThanOrEqual(r.hasta);

    return this.repo.find({
      where,
      relations: ['producto', 'usuario'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const kardex = await this.repo.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['producto', 'usuario'],
    });
    if (!kardex) throw new NotFoundException('Movimiento de kardex no encontrado');
    return kardex;
  }

  /**
   * Movimiento manual de inventario como transacción atómica con bloqueo
   * pesimista: el stock anterior y el nuevo los calcula el servidor, se
   * actualiza el producto y, en las entradas con costo, el costo promedio ponderado.
   */
  async create(dto: CrearKardexDto, usuarioId: string) {
    return this.dataSource.transaction(async (m) => {
      const producto = await m.findOne(Producto, { where: { id: dto.productoId }, lock: { mode: 'pessimistic_write' } });
      if (!producto) throw new NotFoundException('Producto no encontrado');

      const stockAnterior = producto.stockActual;
      let stockNuevo: number;
      let cantidad: number;
      const cambios: { stockActual?: number; costoPromedio?: number } = {};

      if (dto.tipoMovimiento === 'ENTRADA') {
        cantidad = dto.cantidad!;
        stockNuevo = stockAnterior + cantidad;
        if (dto.costoUnitario !== undefined) {
          const costoPrevio = producto.costoPromedio != null ? Number(producto.costoPromedio) : null;
          cambios.costoPromedio =
            costoPrevio === null || stockAnterior <= 0
              ? round2(dto.costoUnitario)
              : round2((stockAnterior * costoPrevio + cantidad * dto.costoUnitario) / stockNuevo);
        }
      } else if (dto.tipoMovimiento === 'SALIDA') {
        cantidad = dto.cantidad!;
        if (cantidad > stockAnterior) {
          throw new BadRequestException(`Stock insuficiente (disponible: ${stockAnterior}).`);
        }
        stockNuevo = stockAnterior - cantidad;
      } else {
        stockNuevo = dto.stockNuevo!;
        cantidad = Math.abs(stockNuevo - stockAnterior);
        if (cantidad === 0) throw new BadRequestException('El conteo coincide con el stock actual; no hay nada que ajustar.');
      }

      cambios.stockActual = stockNuevo;
      await m.update(Producto, producto.id, cambios);
      const mov = await m.save(
        m.create(Kardex, {
          productoId: producto.id,
          tipoMovimiento: dto.tipoMovimiento,
          cantidad,
          costoUnitario: dto.costoUnitario ?? producto.costoPromedio ?? undefined,
          stockAnterior,
          stockNuevo,
          referencia: dto.referencia || (dto.tipoMovimiento === 'ENTRADA' ? 'COMPRA' : dto.tipoMovimiento),
          observacion: dto.observacion,
          usuarioId,
        }),
      );
      return m.findOne(Kardex, { where: { id: mov.id }, relations: ['producto', 'usuario'] });
    });
  }

  async obtenerPorProducto(productoId: string) {
    return this.repo.find({
      where: { productoId, deletedAt: IsNull() },
      relations: ['producto', 'usuario'],
      order: { createdAt: 'DESC' },
    });
  }
}
