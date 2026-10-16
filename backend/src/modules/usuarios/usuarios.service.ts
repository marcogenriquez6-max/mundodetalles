import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, ILike } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Usuario } from '../../entities/usuario.entity';
import { CrearUsuarioDto } from '../../dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from '../../dto/actualizar-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly repo: Repository<Usuario>,
  ) {}

  async findAll(filters?: { search?: string; rolId?: string; esActivo?: boolean }) {
    const where: any = { deletedAt: IsNull() };
    if (filters?.search) {
      where.nombre = ILike(`%${filters.search}%`);
    }
    if (filters?.rolId) {
      where.rolId = filters.rolId;
    }
    if (filters?.esActivo !== undefined) {
      where.esActivo = filters.esActivo;
    }
    return this.repo.find({ relations: ['rol'], where });
  }

  async findOne(id: string) {
    const usuario = await this.repo.findOne({
      where: { id },
      relations: ['rol', 'rol.permisos'],
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return usuario;
  }

  async create(dto: CrearUsuarioDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const usuario = this.repo.create({ ...dto, passwordHash });
    return this.repo.save(usuario);
  }

  async update(id: string, dto: ActualizarUsuarioDto) {
    const usuario = await this.findOne(id);
    if (dto.password) {
      dto['passwordHash'] = await bcrypt.hash(dto.password, 10);
      delete dto.password;
    }
    Object.assign(usuario, dto);
    return this.repo.save(usuario);
  }

  async remove(id: string, usuarioId?: string) {
    const usuario = await this.findOne(id);
    usuario.deletedAt = new Date();
    usuario.deletedById = usuarioId ?? null;
    return this.repo.save(usuario);
  }
}
