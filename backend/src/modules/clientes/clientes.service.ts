import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, ILike } from 'typeorm';
import { Cliente } from '../../entities/cliente.entity';
import { CrearClienteDto } from '../../dto/crear-cliente.dto';
import { ActualizarClienteDto } from '../../dto/actualizar-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(@InjectRepository(Cliente) private readonly repo: Repository<Cliente>) {}

  async findAll(filters?: { search?: string; nivelFidelizacion?: string; tipoDocumento?: string }) {
    const base: any = { deletedAt: IsNull() };
    if (filters?.nivelFidelizacion) base.nivelFidelizacion = filters.nivelFidelizacion;
    if (filters?.tipoDocumento) base.tipoDocumento = filters.tipoDocumento;
    // Búsqueda sin distinguir mayúsculas por nombre, apellido o documento.
    const q = filters?.search?.trim();
    const where = q
      ? [
          { ...base, nombre: ILike(`%${q}%`) },
          { ...base, apellido: ILike(`%${q}%`) },
          { ...base, numeroDocumento: ILike(`%${q}%`) },
        ]
      : base;
    return this.repo.find({ where, order: { nombre: 'ASC', apellido: 'ASC' } });
  }

  async findOne(id: string) {
    const cliente = await this.repo.findOne({ where: { id }, relations: ['ventas', 'fidelizacionHistorial'] });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');
    return cliente;
  }

  async findByDocumento(numeroDocumento: string) {
    return this.repo.findOne({ where: { numeroDocumento } });
  }

  async create(dto: CrearClienteDto) {
    const cliente = this.repo.create(dto);
    return this.repo.save(cliente);
  }

  async update(id: string, dto: ActualizarClienteDto) {
    const cliente = await this.findOne(id);
    Object.assign(cliente, dto);
    return this.repo.save(cliente);
  }

  async remove(id: string, usuarioId?: string) {
    const cliente = await this.findOne(id);
    cliente.deletedAt = new Date();
    cliente.deletedById = usuarioId ?? null;
    return this.repo.save(cliente);
  }
}
