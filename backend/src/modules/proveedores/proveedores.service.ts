import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, ILike } from 'typeorm';
import { Proveedor } from '../../entities/proveedor.entity';
import { CrearProveedorDto } from '../../dto/crear-proveedor.dto';
import { ActualizarProveedorDto } from '../../dto/actualizar-proveedor.dto';

@Injectable()
export class ProveedoresService {
  constructor(@InjectRepository(Proveedor) private readonly repo: Repository<Proveedor>) {}

  async findAll(filters?: { search?: string; esActivo?: boolean }) {
    const where: any = { deletedAt: IsNull() };
    if (filters?.search) {
      where.nombre = ILike(`%${filters.search}%`);
    }
    if (filters?.esActivo !== undefined) {
      where.esActivo = filters.esActivo;
    }
    return this.repo.find({ where });
  }

  async findOne(id: string) {
    const proveedor = await this.repo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!proveedor) throw new NotFoundException('Proveedor no encontrado');
    return proveedor;
  }

  async create(dto: CrearProveedorDto) {
    const proveedor = this.repo.create(dto);
    return this.repo.save(proveedor);
  }

  async update(id: string, dto: ActualizarProveedorDto) {
    const proveedor = await this.findOne(id);
    Object.assign(proveedor, dto);
    return this.repo.save(proveedor);
  }

  async remove(id: string, usuarioId?: string) {
    const proveedor = await this.findOne(id);
    proveedor.deletedAt = new Date();
    proveedor.deletedById = usuarioId ?? null;
    return this.repo.save(proveedor);
  }
}
