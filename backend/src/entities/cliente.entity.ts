import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Venta } from './venta.entity';
import { FidelizacionHistorial } from './fidelizacion-historial.entity';

@Entity({ name: 'clientes', schema: 'inventario' })
export class Cliente extends BaseEntity {
  @Column({ name: 'tipo_documento', length: 20, default: 'CI' })
  tipoDocumento: string;

  @Column({ name: 'numero_documento', unique: true, length: 20 })
  numeroDocumento: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 100 })
  apellido: string;

  @Column({ nullable: true, length: 180 })
  email?: string;

  @Column({ nullable: true, length: 20 })
  telefono?: string;

  @Column({ nullable: true, type: 'text' })
  direccion?: string;

  @Column({ name: 'fecha_registro', type: 'date', default: () => 'CURRENT_DATE' })
  fechaRegistro: Date;

  @Column({ name: 'puntos_acumulados', default: 0 })
  puntosAcumulados: number;

  @Column({
    name: 'nivel_fidelizacion',
    length: 20,
    default: 'BRONCE',
  })
  nivelFidelizacion: string;

  @OneToMany(() => Venta, (venta) => venta.cliente)
  ventas: Venta[];

  @OneToMany(() => FidelizacionHistorial, (fh) => fh.cliente)
  fidelizacionHistorial: FidelizacionHistorial[];
}
