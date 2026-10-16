import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Producto } from './producto.entity';
import { Usuario } from './usuario.entity';

@Entity({ name: 'kardex', schema: 'inventario' })
export class Kardex extends BaseEntity {
  @Column({ name: 'producto_id' })
  productoId: string;

  @ManyToOne(() => Producto)
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @Column({ name: 'tipo_movimiento', length: 20 })
  tipoMovimiento: string;

  @Column()
  cantidad: number;

  @Column({ name: 'costo_unitario', type: 'decimal', precision: 12, scale: 2, nullable: true })
  costoUnitario?: number;

  @Column({ name: 'stock_anterior' })
  stockAnterior: number;

  @Column({ name: 'stock_nuevo' })
  stockNuevo: number;

  @Column({ length: 100, nullable: true })
  referencia?: string;

  @Column({ name: 'referencia_id', nullable: true })
  referenciaId?: string;

  @Column({ type: 'text', nullable: true })
  observacion?: string;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario?: Usuario;

  @Column({ name: 'usuario_id', nullable: true })
  usuarioId?: string;
}
