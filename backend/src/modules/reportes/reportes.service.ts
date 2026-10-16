import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Reporte } from '../../entities/reporte.entity';
import { CrearReporteDto } from '../../dto/crear-reporte.dto';
import { ActualizarReporteDto } from '../../dto/actualizar-reporte.dto';

@Injectable()
export class ReportesService {
  constructor(@InjectRepository(Reporte) private readonly repo: Repository<Reporte>) {}

  async findAll(usuarioId?: string): Promise<Reporte[]> {
    return this.repo.find({
      where: usuarioId
        ? [{ deletedAt: IsNull(), esPublico: true }, { deletedAt: IsNull(), usuarioId }]
        : { deletedAt: IsNull() },
      relations: ['usuario'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Reporte> {
    const reporte = await this.repo.findOne({ where: { id }, relations: ['usuario'] });
    if (!reporte) throw new NotFoundException('Reporte no encontrado');
    return reporte;
  }

  async create(dto: CrearReporteDto, usuarioId?: string): Promise<Reporte> {
    const reporte = this.repo.create({
      ...dto,
      usuarioId: usuarioId ?? dto.usuarioId,
      esPublico: dto.esPublico ?? false,
    });
    return this.repo.save(reporte);
  }

  async update(id: string, dto: ActualizarReporteDto): Promise<Reporte> {
    const reporte = await this.findOne(id);
    Object.assign(reporte, dto);
    return this.repo.save(reporte);
  }

  async remove(id: string, usuarioId?: string): Promise<Reporte> {
    const reporte = await this.findOne(id);
    reporte.deletedAt = new Date();
    reporte.deletedById = usuarioId ?? null;
    return this.repo.save(reporte);
  }
}
