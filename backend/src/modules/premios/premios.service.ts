import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { Premio } from '../../entities/premio.entity';
import { Cliente } from '../../entities/cliente.entity';
import { FidelizacionHistorial } from '../../entities/fidelizacion-historial.entity';
import { CrearPremioDto } from '../../dto/crear-premio.dto';
import { ActualizarPremioDto } from '../../dto/actualizar-premio.dto';

@Injectable()
export class PremiosService {
  constructor(
    @InjectRepository(Premio) private readonly premioRepo: Repository<Premio>,
    private readonly dataSource: DataSource,
  ) {}

  /** Lista premios. Por defecto solo los disponibles (activos y con stock > 0). */
  async findAll(soloDisponibles = false): Promise<Premio[]> {
    const qb = this.premioRepo
      .createQueryBuilder('p')
      .where('p.deletedAt IS NULL')
      .orderBy('p.puntosRequeridos', 'ASC');
    if (soloDisponibles) {
      qb.andWhere('p.esActivo = true').andWhere('p.stock > 0');
    }
    return qb.getMany();
  }

  async findOne(id: string): Promise<Premio> {
    const premio = await this.premioRepo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!premio) throw new NotFoundException('Premio no encontrado');
    return premio;
  }

  async create(dto: CrearPremioDto): Promise<Premio> {
    const premio = this.premioRepo.create(dto);
    return this.premioRepo.save(premio);
  }

  async update(id: string, dto: ActualizarPremioDto): Promise<Premio> {
    const premio = await this.findOne(id);
    Object.assign(premio, dto);
    return this.premioRepo.save(premio);
  }

  async remove(id: string, usuarioId?: string): Promise<Premio> {
    const premio = await this.findOne(id);
    premio.deletedAt = new Date();
    premio.deletedById = usuarioId ?? null;
    return this.premioRepo.save(premio);
  }

  /**
   * Canjea un premio por puntos: valida saldo del cliente y stock del premio,
   * descuenta ambos y registra la redención en el historial de fidelización.
   * Todo dentro de una transacción con bloqueo pesimista.
   */
  async canjear(premioId: string, clienteId: string, usuarioId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const premio = await queryRunner.manager.findOne(Premio, {
        where: { id: premioId, deletedAt: IsNull() },
        lock: { mode: 'pessimistic_write' },
      });
      if (!premio) throw new NotFoundException('Premio no encontrado');
      if (!premio.esActivo) throw new BadRequestException('El premio no está activo');
      if (premio.stock <= 0) throw new BadRequestException('El premio está agotado');

      const cliente = await queryRunner.manager.findOne(Cliente, {
        where: { id: clienteId, deletedAt: IsNull() },
        lock: { mode: 'pessimistic_write' },
      });
      if (!cliente) throw new NotFoundException('Cliente no encontrado');
      if (cliente.puntosAcumulados < premio.puntosRequeridos) {
        throw new BadRequestException(
          `Puntos insuficientes (tiene ${cliente.puntosAcumulados}, requiere ${premio.puntosRequeridos})`,
        );
      }

      const saldoAnterior = cliente.puntosAcumulados;
      const saldoPosterior = saldoAnterior - premio.puntosRequeridos;

      await queryRunner.manager.update(Premio, premio.id, { stock: premio.stock - 1 });
      await queryRunner.manager.update(Cliente, cliente.id, { puntosAcumulados: saldoPosterior });

      await queryRunner.manager.save(FidelizacionHistorial, {
        clienteId: cliente.id,
        tipoOperacion: 'REDENCION',
        puntos: -premio.puntosRequeridos,
        saldoAnterior,
        saldoPosterior,
        descripcion: `Canje de premio: ${premio.nombre}`,
        createdById: usuarioId,
      });

      const canjeRows = await queryRunner.manager.query(
        `INSERT INTO inventario.canjes (cliente_id, premio_id, puntos_usados, created_by)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [cliente.id, premio.id, premio.puntosRequeridos, usuarioId],
      );
      const canje = canjeRows[0];

      await queryRunner.commitTransaction();
      return {
        mensaje: 'Canje realizado con éxito',
        premio: premio.nombre,
        puntosUsados: premio.puntosRequeridos,
        saldoPuntos: saldoPosterior,
        stockRestante: premio.stock - 1,
        canje,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
