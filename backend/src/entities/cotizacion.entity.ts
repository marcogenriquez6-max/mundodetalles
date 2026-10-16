import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Cliente } from './cliente.entity';
import { Usuario } from './usuario.entity';
import { DetalleCotizacion } from './detalle-cotizacion.entity';

@Entity({ name: 'cotizaciones', schema: 'inventario' })
export class Cotizacion extends BaseEntity {
  @Column({ length: 100, unique: true })
  codigo: string;

  @Column({ name: 'cliente_id', nullable: true })
  clienteId?: string;

  @ManyToOne(() => Cliente, { nullable: true })
  @JoinColumn({ name: 'cliente_id' })
  cliente?: Cliente;

  @Column({ name: 'fecha_validez', type: 'date', nullable: true })
  fechaValidez?: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  impuesto: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  descuento: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({ length: 20, default: 'PENDIENTE' })
  estado: string;

  @Column({ type: 'text', nullable: true })
  observaciones?: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ name: 'usuario_id' })
  usuarioId: string;

  @OneToMany(() => DetalleCotizacion, (detalle) => detalle.cotizacion, { cascade: true })
  detalles: DetalleCotizacion[];
}
