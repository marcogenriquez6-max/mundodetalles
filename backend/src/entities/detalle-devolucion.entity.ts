import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Devolucion } from './devolucion.entity';
import { Producto } from './producto.entity';

@Entity({ name: 'detalle_devolucion', schema: 'inventario' })
export class DetalleDevolucion {
  @Column('uuid', { primary: true, generated: 'uuid' })
  id: string;

  @ManyToOne(() => Devolucion, (dev) => dev.detalles)
  @JoinColumn({ name: 'devolucion_id' })
  devolucion: Devolucion;

  @Column({ name: 'devolucion_id' })
  devolucionId: string;

  @ManyToOne(() => Producto)
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @Column({ name: 'producto_id' })
  productoId: string;

  @Column()
  cantidad: number;

  @Column({ name: 'precio_unitario', type: 'decimal', precision: 12, scale: 2 })
  precioUnitario: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;
}
