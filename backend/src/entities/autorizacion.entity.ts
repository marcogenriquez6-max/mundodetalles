import { Entity, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Venta } from './venta.entity';
import { DetalleVenta } from './detalle-venta.entity';
import { Usuario } from './usuario.entity';

@Entity({ name: 'autorizaciones', schema: 'inventario' })
export class Autorizacion {
  @Column('uuid', { primary: true, generated: 'uuid' })
  id: string;

  @ManyToOne(() => DetalleVenta, { nullable: true })
  @JoinColumn({ name: 'detalle_venta_id' })
  detalleVenta?: DetalleVenta;

  @Column({ name: 'detalle_venta_id', nullable: true })
  detalleVentaId?: string;

  @ManyToOne(() => Venta)
  @JoinColumn({ name: 'venta_id' })
  venta: Venta;

  @Column({ name: 'venta_id' })
  ventaId: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'solicitante_id' })
  solicitante: Usuario;

  @Column({ name: 'solicitante_id' })
  solicitanteId: string;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'aprobador_id' })
  aprobador?: Usuario;

  @Column({ name: 'aprobador_id', nullable: true })
  aprobadorId?: string;

  @Column({ length: 30 })
  tipo: string;

  @Column({ length: 20, default: 'PENDIENTE' })
  estado: string;

  @Column({ name: 'precio_solicitado', type: 'decimal', precision: 12, scale: 2, nullable: true })
  precioSolicitado?: number;

  @Column({ name: 'precio_aprobado', type: 'decimal', precision: 12, scale: 2, nullable: true })
  precioAprobado?: number;

  @Column({ name: 'motivo_solicitud', type: 'text' })
  motivoSolicitud: string;

  @Column({ name: 'motivo_respuesta', nullable: true, type: 'text' })
  motivoRespuesta?: string;

  @Column({ name: 'session_id', nullable: true, length: 100 })
  sessionId?: string;

  @Column({ name: 'expira_en', type: 'timestamptz' })
  expiraEn: Date;

  @Column({ name: 'respondida_en', type: 'timestamptz', nullable: true })
  respondidaEn?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
