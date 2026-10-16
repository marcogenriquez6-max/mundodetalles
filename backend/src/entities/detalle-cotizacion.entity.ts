import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Cotizacion } from './cotizacion.entity';
import { Producto } from './producto.entity';

@Entity({ name: 'detalle_cotizacion', schema: 'inventario' })
export class DetalleCotizacion {
  @Column('uuid', { primary: true, generated: 'uuid' })
  id: string;

  @ManyToOne(() => Cotizacion, (cot) => cot.detalles)
  @JoinColumn({ name: 'cotizacion_id' })
  cotizacion: Cotizacion;

  @Column({ name: 'cotizacion_id' })
  cotizacionId: string;

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
