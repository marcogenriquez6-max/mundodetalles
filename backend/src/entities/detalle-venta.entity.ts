import { Entity, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Venta } from './venta.entity';
import { Producto } from './producto.entity';
import { Autorizacion } from './autorizacion.entity';

@Entity({ name: 'detalle_venta', schema: 'inventario' })
export class DetalleVenta {
  @Column('uuid', { primary: true, generated: 'uuid' })
  id: string;

  @ManyToOne(() => Venta, (venta) => venta.detalles)
  @JoinColumn({ name: 'venta_id' })
  venta: Venta;

  @Column({ name: 'venta_id' })
  ventaId: string;

  @ManyToOne(() => Producto)
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @Column({ name: 'producto_id' })
  productoId: string;

  @Column()
  cantidad: number;

  @Column({ name: 'precio_unitario', type: 'decimal', precision: 12, scale: 2 })
  precioUnitario: number;

  @Column({ name: 'precio_autorizado', type: 'decimal', precision: 12, scale: 2, nullable: true })
  precioAutorizado?: number;

  @Column({ name: 'descuento_aplicado', type: 'decimal', precision: 12, scale: 2, default: 0 })
  descuentoAplicado: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @Column({ name: 'requiere_autorizacion', default: false })
  requiereAutorizacion: boolean;

  @ManyToOne(() => Autorizacion, { nullable: true })
  @JoinColumn({ name: 'autorizacion_id' })
  autorizacion?: Autorizacion;

  @Column({ name: 'autorizacion_id', nullable: true })
  autorizacionId?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
