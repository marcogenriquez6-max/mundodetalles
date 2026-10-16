import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Between, MoreThanOrEqual } from 'typeorm';
import { Cotizacion } from '../../entities/cotizacion.entity';
import { DetalleCotizacion } from '../../entities/detalle-cotizacion.entity';
import { CrearCotizacionDto } from '../../dto/crear-cotizacion.dto';
import { ActualizarCotizacionDto } from '../../dto/actualizar-cotizacion.dto';
import { Producto } from '../../entities/producto.entity';
import { rangoFechas, round2 } from '../../common/negocio.util';

@Injectable()
export class CotizacionesService {
  constructor(
    @InjectRepository(Cotizacion) private readonly cotizacionRepo: Repository<Cotizacion>,
    @InjectRepository(DetalleCotizacion) private readonly detalleRepo: Repository<DetalleCotizacion>,
  ) {}

  async findAll(filters?: { estado?: string; clienteId?: string; desde?: string; hasta?: string }) {
    const where: any = { deletedAt: IsNull() };
    if (filters?.estado) where.estado = filters.estado;
    if (filters?.clienteId) where.clienteId = filters.clienteId;
    const r = rangoFechas(filters?.desde, filters?.hasta);
    if (r.desde && r.hasta) where.createdAt = Between(r.desde, r.hasta);
    else if (r.desde) where.createdAt = MoreThanOrEqual(r.desde);
    return this.cotizacionRepo.find({
      where,
      relations: ['cliente', 'usuario', 'detalles', 'detalles.producto'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const cotizacion = await this.cotizacionRepo.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['cliente', 'usuario', 'detalles', 'detalles.producto'],
    });
    if (!cotizacion) throw new NotFoundException('Cotización no encontrada');
    return cotizacion;
  }

  async create(dto: CrearCotizacionDto, usuarioId?: string) {
    const existing = await this.cotizacionRepo.findOne({ where: { codigo: dto.codigo } });
    if (existing) {
      throw new BadRequestException(`Ya existe una cotización con el código ${dto.codigo}`);
    }

    // Precios del catálogo vigente (la cotización no puede inventar precios).
    const lineas: { productoId: string; cantidad: number; precioUnitario: number; subtotal: number }[] = [];
    for (const det of dto.detalles) {
      const producto = await this.cotizacionRepo.manager.findOne(Producto, { where: { id: det.productoId } });
      if (!producto) throw new NotFoundException('Uno de los productos no existe o fue eliminado.');
      const precioUnitario = Number(producto.precioBase);
      lineas.push({ productoId: det.productoId, cantidad: det.cantidad, precioUnitario, subtotal: round2(precioUnitario * det.cantidad) });
    }
    const subtotal = round2(lineas.reduce((s, l) => s + l.subtotal, 0));

    const saved = await this.cotizacionRepo.manager.transaction(async (m) => {
      const cab = await m.save(
        m.create(Cotizacion, {
          codigo: dto.codigo,
          clienteId: dto.clienteId || undefined,
          fechaValidez: dto.fechaValidez ? (dto.fechaValidez.slice(0, 10) as any) : undefined,
          subtotal,
          impuesto: 0,
          descuento: 0,
          total: subtotal,
          estado: 'PENDIENTE',
          observaciones: dto.observaciones,
          usuarioId: usuarioId || undefined,
        }),
      );
      for (const l of lineas) {
        await m.save(m.create(DetalleCotizacion, { cotizacionId: cab.id, ...l }));
      }
      return cab;
    });

    return this.findOne(saved.id);
  }

  async update(id: string, dto: ActualizarCotizacionDto) {
    const cotizacion = await this.findOne(id);
    if (dto.codigo !== undefined) {
      const existing = await this.cotizacionRepo.findOne({ where: { codigo: dto.codigo } });
      if (existing && existing.id !== id) {
        throw new BadRequestException(`Ya existe una cotización con el código ${dto.codigo}`);
      }
    }
    Object.assign(cotizacion, dto);
    if (dto.fechaValidez) {
      cotizacion.fechaValidez = dto.fechaValidez.slice(0, 10) as any;
    }
    return this.cotizacionRepo.save(cotizacion);
  }

  async remove(id: string, usuarioId?: string) {
    const cotizacion = await this.findOne(id);
    cotizacion.deletedAt = new Date();
    cotizacion.deletedById = usuarioId ?? null;
    return this.cotizacionRepo.save(cotizacion);
  }
}
