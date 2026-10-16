import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Usuario } from './usuario.entity';

@Entity({ name: 'caja', schema: 'inventario' })
export class Caja extends BaseEntity {
  @Column({ name: 'fecha_apertura', type: 'timestamptz' })
  fechaApertura: Date;

  @Column({ name: 'fecha_cierre', type: 'timestamptz', nullable: true })
  fechaCierre?: Date;

  @Column({ name: 'monto_inicial', type: 'decimal', precision: 12, scale: 2 })
  montoInicial: number;

  @Column({ name: 'monto_final', type: 'decimal', precision: 12, scale: 2, nullable: true })
  montoFinal?: number;

  @Column({ name: 'total_ingresos', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalIngresos: number;

  @Column({ name: 'total_egresos', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalEgresos: number;

  @Column({ length: 20, default: 'ABIERTA' })
  estado: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_apertura_id' })
  usuarioApertura: Usuario;

  @Column({ name: 'usuario_apertura_id' })
  usuarioAperturaId: string;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_cierre_id' })
  usuarioCierre?: Usuario;

  @Column({ name: 'usuario_cierre_id', nullable: true })
  usuarioCierreId?: string;

  @Column({ type: 'text', nullable: true })
  observaciones?: string;
}
