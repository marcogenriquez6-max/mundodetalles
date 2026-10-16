import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Rol } from '../../entities/rol.entity';
import { CrearRolDto } from '../../dto/crear-rol.dto';
import { ActualizarRolDto } from '../../dto/actualizar-rol.dto';

@Injectable()
export class RolesService {
  constructor(@InjectRepository(Rol) private readonly repo: Repository<Rol>) {}

  async findAll() {
    return this.repo.find({ relations: ['permisos'], where: { deletedAt: IsNull() } });
  }

  async findOne(id: string) {
    const rol = await this.repo.findOne({ where: { id }, relations: ['permisos'] });
    if (!rol) throw new NotFoundException('Rol no encontrado');
    return rol;
  }

  async create(dto: CrearRolDto) {
    const rol = this.repo.create(dto);
    return this.repo.save(rol);
  }

  async update(id: string, dto: ActualizarRolDto) {
    const rol = await this.findOne(id);
    Object.assign(rol, dto);
    return this.repo.save(rol);
  }

  async remove(id: string, usuarioId?: string) {
    const rol = await this.findOne(id);
    if (rol.esSistema) {
      throw new BadRequestException('Los roles del sistema (Administrador, Cajero, Vendedor) no se pueden eliminar.');
    }
    const [{ n }] = await this.repo.query(
      'SELECT COUNT(*)::int AS n FROM inventario.usuarios WHERE rol_id = $1 AND deleted_at IS NULL',
      [id],
    );
    if (n > 0) throw new BadRequestException(`El rol tiene ${n} usuario(s) asignado(s); reasígnelos antes de eliminarlo.`);
    rol.deletedAt = new Date();
    rol.deletedById = usuarioId ?? null;
    return this.repo.save(rol);
  }
}
