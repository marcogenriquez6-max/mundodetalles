import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from './base.entity';
import { Usuario } from './usuario.entity';

export enum TipoReporte {
  VENTAS_DIA = 'VENTAS_DIA',
  VENTAS_MES = 'VENTAS_MES',
  RANKING_CLIENTES = 'RANKING_CLIENTES',
  INVENTARIO = 'INVENTARIO',
  PERSONALIZADO = 'PERSONALIZADO',
}

@Entity({ name: 'reportes', schema: 'inventario' })
export class Reporte extends BaseEntity {
  @ApiProperty({ description: 'Nombre del reporte', example: 'Ventas del día' })
  @Column({ name: 'nombre', type: 'varchar', length: 200 })
  nombre: string;

  @ApiPropertyOptional({ description: 'Descripción del reporte', example: 'Reporte diario de ventas con filtros por método de pago' })
  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion?: string;

  @ApiProperty({ description: 'Tipo de reporte', enum: TipoReporte, example: TipoReporte.VENTAS_DIA })
  @Column({ name: 'tipo', type: 'varchar', length: 50 })
  tipo: TipoReporte;

  @ApiPropertyOptional({ description: 'Filtros del reporte en formato JSON', example: { fechaDesde: '', fechaHasta: '', metodoPago: 'EFECTIVO' } })
  @Column({ name: 'filtros', type: 'jsonb', nullable: true })
  filtros?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Columnas visibles del reporte', example: ['fecha', 'cantidad', 'total'] })
  @Column({ name: 'columnas', type: 'jsonb', nullable: true })
  columnas?: string[];

  @ApiProperty({ description: 'Indica si el reporte es visible para todos los usuarios', example: false })
  @Column({ name: 'es_publico', type: 'boolean', default: false })
  esPublico: boolean;

  @ApiPropertyOptional({ description: 'Identificador del usuario creador' })
  @Column({ name: 'usuario_id', nullable: true })
  usuarioId?: string;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario?: Usuario;
}
