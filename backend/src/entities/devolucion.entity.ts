import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Venta } from './venta.entity';
import { Usuario } from './usuario.entity';
import { DetalleDevolucion } from './detalle-devolucion.entity';

@Entity({ name: 'devoluciones', schema: 'inventario' })
export class Devolucion extends BaseEntity {
  @Column({ name: 'venta_id' })
  ventaId: string;

  @ManyToOne(() => Venta)
  @JoinColumn({ name: 'venta_id' })
  venta: Venta;

  @Column({ length: 100, unique: true })
  codigo: string;

  @Column({ type: 'text' })
  motivo: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  impuesto: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({ length: 20, default: 'COMPLETADA' })
  estado: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ name: 'usuario_id' })
  usuarioId: string;

  @OneToMany(() => DetalleDevolucion, (detalle) => detalle.devolucion, { cascade: true })
  detalles: DetalleDevolucion[];
}
