import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Configuracion } from '../../entities/configuracion.entity';

@Injectable()
export class ConfiguracionService {
  constructor(@InjectRepository(Configuracion) private readonly repo: Repository<Configuracion>) {}

  async get(clave: string) {
    const config = await this.repo.findOne({ where: { clave, deletedAt: IsNull() } });
    if (!config) throw new NotFoundException(`Configuración "${clave}" no encontrada`);
    return { clave: config.clave, valor: this.parseValue(config.valor, config.tipo), tipo: config.tipo };
  }

  async set(clave: string, valor: string, tipo?: string, descripcion?: string) {
    const tipoFinal = tipo ?? (await this.repo.findOne({ where: { clave }, withDeleted: true }))?.tipo ?? 'string';
    this.validarValor(clave, valor, tipoFinal);
    // Incluye registros eliminados: si la clave existió, se restaura en lugar de duplicarla.
    let existing = await this.repo.findOne({ where: { clave }, withDeleted: true });
    if (existing) {
      existing.deletedAt = null;
      existing.deletedById = null;
      if (tipo !== undefined) existing.tipo = tipo;
      if (descripcion !== undefined) existing.descripcion = descripcion;
      existing.valor = valor;
      return this.repo.save(existing);
    }
    const config = this.repo.create({
      clave,
      valor,
      tipo: tipo || 'string',
      descripcion,
    });
    return this.repo.save(config);
  }

  async delete(clave: string, usuarioId?: string) {
    const config = await this.repo.findOne({ where: { clave, deletedAt: IsNull() } });
    if (!config) throw new NotFoundException(`Configuración "${clave}" no encontrada`);
    if (config.esSistema) {
      throw new BadRequestException(`"${clave}" es un parámetro del sistema; puede modificar su valor, pero no eliminarlo.`);
    }
    config.deletedAt = new Date();
    config.deletedById = usuarioId ?? null;
    return this.repo.save(config);
  }

  async obtenerTodos() {
    const configs = await this.repo.find({ where: { deletedAt: IsNull() } });
    return configs.map((c) => ({
      clave: c.clave,
      valor: this.parseValue(c.valor, c.tipo),
      tipo: c.tipo,
      descripcion: c.descripcion,
    }));
  }

  /** Valida que el valor sea coherente con su tipo (y que los parámetros numéricos no sean negativos). */
  private validarValor(clave: string, valor: string, tipo: string) {
    if (tipo === 'number') {
      const n = Number(valor);
      if (valor.trim() === '' || !Number.isFinite(n)) throw new BadRequestException(`"${clave}" debe ser un número.`);
      if (n < 0) throw new BadRequestException(`"${clave}" no puede ser negativo.`);
    } else if (tipo === 'boolean' && !['true', 'false', '1', '0'].includes(valor)) {
      throw new BadRequestException(`"${clave}" debe ser true o false.`);
    } else if (tipo === 'json') {
      try { JSON.parse(valor); } catch { throw new BadRequestException(`"${clave}" debe ser un JSON válido.`); }
    }
  }

  private parseValue(valor: string, tipo: string) {
    switch (tipo) {
      case 'number':
        return Number(valor);
      case 'boolean':
        return valor === 'true' || valor === '1';
      case 'json':
        try {
          return JSON.parse(valor);
        } catch {
          return valor;
        }
      default:
        return valor;
    }
  }
}
