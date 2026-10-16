import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Cliente } from './cliente.entity';
import { Usuario } from './usuario.entity';
import { DetalleVenta } from './detalle-venta.entity';
import { Autorizacion } from './autorizacion.entity';

@Entity({ name: 'ventas', schema: 'inventario' })
export class Venta extends BaseEntity {
  @Column({ name: 'codigo_comprobante', unique: true, length: 20 })
  codigoComprobante: string;

  @Column({ name: 'tipo_comprobante', length: 20, default: 'NOTA_VENTA' })
  tipoComprobante: string;

  @ManyToOne(() => Cliente, (cliente) => cliente.ventas, { nullable: true })
  @JoinColumn({ name: 'cliente_id' })
  cliente?: Cliente;

  @Column({ name: 'cliente_id', nullable: true })
  clienteId?: string;

  @ManyToOne(() => Usuario, (user) => user.ventas)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ name: 'usuario_id' })
  usuarioId: string;

  @ManyToOne(() => Autorizacion, { nullable: true })
  @JoinColumn({ name: 'autorizacion_id' })
  autorizacion?: Autorizacion;

  @Column({ name: 'autorizacion_id', nullable: true })
  autorizacionId?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  descuento: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  impuesto: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({ name: 'puntos_generados', default: 0 })
  puntosGenerados: number;

  @Column({ name: 'puntos_redimidos', default: 0 })
  puntosRedimidos: number;

  @Column({ name: 'metodo_pago', length: 30, default: 'EFECTIVO' })
  metodoPago: string;

  @Column({ length: 20, default: 'COMPLETADA' })
  estado: string;

  @Column({ name: 'motivo_anulacion', nullable: true, type: 'text' })
  motivoAnulacion?: string;

  @Column({ name: 'tiene_devolucion', default: false })
  tieneDevolucion: boolean;

  @OneToMany(() => DetalleVenta, (detalle) => detalle.venta, { cascade: true })
  detalles: DetalleVenta[];
}
