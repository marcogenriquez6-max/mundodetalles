import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permiso } from '../../entities/permiso.entity';
import { CrearPermisoDto } from '../../dto/crear-permiso.dto';
import { ActualizarPermisoDto } from '../../dto/actualizar-permiso.dto';

@Injectable()
export class PermisosService {
  constructor(@InjectRepository(Permiso) private readonly repo: Repository<Permiso>) {}

  async findAll() {
    return this.repo.find();
  }

  async findOne(id: string) {
    const permiso = await this.repo.findOne({ where: { id } });
    if (!permiso) throw new NotFoundException('Permiso no encontrado');
    return permiso;
  }

  async create(dto: CrearPermisoDto) {
    const permiso = this.repo.create(dto);
    return this.repo.save(permiso);
  }

  async update(id: string, dto: ActualizarPermisoDto) {
    const permiso = await this.findOne(id);
    Object.assign(permiso, dto);
    return this.repo.save(permiso);
  }

  async remove(id: string) {
    const permiso = await this.findOne(id);
    return this.repo.remove(permiso);
  }
}
