import { Entity, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Cliente } from './cliente.entity';
import { Venta } from './venta.entity';
import { Usuario } from './usuario.entity';

@Entity({ name: 'fidelizacion_historial', schema: 'inventario' })
export class FidelizacionHistorial {
  @Column('uuid', { primary: true, generated: 'uuid' })
  id: string;

  @ManyToOne(() => Cliente, (cliente) => cliente.fidelizacionHistorial)
  @JoinColumn({ name: 'cliente_id' })
  cliente: Cliente;

  @Column({ name: 'cliente_id' })
  clienteId: string;

  @ManyToOne(() => Venta, { nullable: true })
  @JoinColumn({ name: 'venta_id' })
  venta?: Venta;

  @Column({ name: 'venta_id', nullable: true })
  ventaId?: string;

  @Column({ name: 'tipo_operacion', length: 20 })
  tipoOperacion: string;

  @Column()
  puntos: number;

  @Column({ name: 'saldo_anterior' })
  saldoAnterior: number;

  @Column({ name: 'saldo_posterior' })
  saldoPosterior: number;

  @Column({ nullable: true, length: 255 })
  descripcion?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'created_by' })
  createdBy: Usuario;

  @Column({ name: 'created_by' })
  createdById: string;
}
