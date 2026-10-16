import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, ILike, DataSource } from 'typeorm';
import { Producto } from '../../entities/producto.entity';
import { Kardex } from '../../entities/kardex.entity';
import { CrearProductoDto } from '../../dto/crear-producto.dto';
import { ActualizarProductoDto } from '../../dto/actualizar-producto.dto';
import { ActualizarPrecioDto } from '../../dto/actualizar-precio.dto';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto) private readonly repo: Repository<Producto>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(filters?: { search?: string; categoriaId?: string; esActivo?: boolean }) {
    const base: any = { deletedAt: IsNull() };
    if (filters?.categoriaId) base.categoriaId = filters.categoriaId;
    if (filters?.esActivo !== undefined) base.esActivo = filters.esActivo;
    // Búsqueda sin distinguir mayúsculas por nombre o SKU.
    const where = filters?.search
      ? [{ ...base, nombre: ILike(`%${filters.search}%`) }, { ...base, sku: ILike(`%${filters.search}%`) }]
      : base;
    return this.repo.find({ where, relations: ['categoria'], order: { nombre: 'ASC' } });
  }

  async findOne(id: string) {
    const prod = await this.repo.findOne({ where: { id }, relations: ['categoria'] });
    if (!prod) throw new NotFoundException('Producto no encontrado');
    return prod;
  }

  /** Alta de producto; el stock inicial queda registrado como ENTRADA en el Kardex. */
  async create(dto: CrearProductoDto, usuarioId?: string) {
    const sku = dto.sku?.trim() ? dto.sku.trim() : await this.generarSku();
    const id = await this.dataSource.transaction(async (m) => {
      const prod = await m.save(m.create(Producto, { ...dto, sku }));
      if (prod.stockActual > 0) {
        await m.save(Kardex, {
          productoId: prod.id,
          tipoMovimiento: 'ENTRADA',
          cantidad: prod.stockActual,
          costoUnitario: prod.costoPromedio ?? undefined,
          stockAnterior: 0,
          stockNuevo: prod.stockActual,
          referencia: 'INVENTARIO_INICIAL',
          observacion: 'Stock inicial al registrar el producto',
          usuarioId,
        });
      }
      return prod.id;
    });
    return this.findOne(id);
  }

  /**
   * Edición del producto. Si se corrige el stock a mano, la diferencia se
   * registra como AJUSTE en el Kardex: ningún cambio de existencias queda sin rastro.
   */
  async update(id: string, dto: ActualizarProductoDto, usuarioId?: string) {
    await this.dataSource.transaction(async (m) => {
      const prod = await m.findOne(Producto, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!prod) throw new NotFoundException('Producto no encontrado');
      const stockAnterior = prod.stockActual;
      Object.assign(prod, dto);
      await m.save(prod);
      if (dto.stockActual !== undefined && dto.stockActual !== stockAnterior) {
        await m.save(Kardex, {
          productoId: id,
          tipoMovimiento: 'AJUSTE',
          cantidad: Math.abs(dto.stockActual - stockAnterior),
          costoUnitario: prod.costoPromedio ?? undefined,
          stockAnterior,
          stockNuevo: dto.stockActual,
          referencia: 'AJUSTE_MANUAL',
          observacion: 'Corrección de stock desde la ficha del producto',
          usuarioId,
        });
      }
    });
    return this.findOne(id);
  }

  async actualizarPrecio(id: string, dto: ActualizarPrecioDto) {
    const prod = await this.findOne(id);
    if (dto.precioBase !== undefined) prod.precioBase = dto.precioBase;
    if (dto.precioMayorista !== undefined) prod.precioMayorista = dto.precioMayorista;
    return this.repo.save(prod);
  }

  async buscarStockBajo() {
    const prods = await this.repo.find({ where: { deletedAt: IsNull(), esActivo: true }, relations: ['categoria'] });
    return prods.filter((p) => p.stockActual <= p.stockMinimo);
  }

  /**
   * Genera un SKU secuencial (PROD-001, PROD-002, …) cuando no se proporciona
   * uno. Toma el mayor consecutivo existente y le suma 1; si ese número ya está
   * ocupado (p. ej. por un registro eliminado) sigue probando el siguiente.
   */
  private async generarSku(): Promise<string> {
    const productos = await this.repo.find({ withDeleted: true, select: ['sku'] });
    let maximo = 0;
    for (const p of productos) {
      const coincide = /^PROD-(\d+)$/.exec(p.sku ?? '');
      if (coincide) maximo = Math.max(maximo, parseInt(coincide[1], 10));
    }
    for (let intento = 1; intento <= 1000; intento++) {
      const candidato = `PROD-${String(maximo + intento).padStart(3, '0')}`;
      const existe = await this.repo.findOne({ where: { sku: candidato }, withDeleted: true });
      if (!existe) return candidato;
    }
    throw new Error('No se pudo generar un SKU único');
  }

  async remove(id: string, usuarioId?: string) {
    const prod = await this.findOne(id);
    prod.deletedAt = new Date();
    prod.deletedById = usuarioId ?? null;
    return this.repo.save(prod);
  }
}
