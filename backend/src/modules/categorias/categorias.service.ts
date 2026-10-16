import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Categoria } from '../../entities/categoria.entity';
import { CrearCategoriaDto } from '../../dto/crear-categoria.dto';
import { ActualizarCategoriaDto } from '../../dto/actualizar-categoria.dto';

@Injectable()
export class CategoriasService {
  constructor(@InjectRepository(Categoria) private readonly repo: Repository<Categoria>) {}

  async findAll() {
    return this.repo.find({ where: { deletedAt: IsNull() }, relations: ['padre', 'productos'] });
  }

  async findOne(id: string) {
    const cat = await this.repo.findOne({ where: { id }, relations: ['padre'] });
    if (!cat) throw new NotFoundException('Categoría no encontrada');
    return cat;
  }

  async create(dto: CrearCategoriaDto) {
    const cat = this.repo.create(dto);
    return this.repo.save(cat);
  }

  async update(id: string, dto: ActualizarCategoriaDto) {
    const cat = await this.findOne(id);
    Object.assign(cat, dto);
    return this.repo.save(cat);
  }

  async remove(id: string, usuarioId?: string) {
    const cat = await this.findOne(id);
    const [{ n }] = await this.repo.query(
      'SELECT COUNT(*)::int AS n FROM inventario.productos WHERE categoria_id = $1 AND deleted_at IS NULL',
      [id],
    );
    if (n > 0) throw new BadRequestException(`La categoría tiene ${n} producto(s); muévalos antes de eliminarla.`);
    cat.deletedAt = new Date();
    cat.deletedById = usuarioId ?? null;
    return this.repo.save(cat);
  }
}
