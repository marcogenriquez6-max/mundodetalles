import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity({ name: 'proveedores', schema: 'inventario' })
export class Proveedor extends BaseEntity {
  @Column({ length: 200 })
  nombre: string;

  @Column({ length: 200, nullable: true })
  contacto?: string;

  @Column({ length: 50, nullable: true })
  telefono?: string;

  @Column({ length: 200, nullable: true })
  email?: string;

  @Column({ type: 'text', nullable: true })
  direccion?: string;

  @Column({ length: 50, nullable: true })
  nit?: string;

  @Column({ name: 'es_activo', default: true })
  esActivo: boolean;
}
