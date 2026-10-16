import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity({ name: 'premios', schema: 'inventario' })
export class Premio extends BaseEntity {
  @Column({ length: 200 })
  nombre: string;

  @Column({ nullable: true, type: 'text' })
  descripcion?: string;

  @Column({ name: 'puntos_requeridos' })
  puntosRequeridos: number;

  @Column({ default: 0 })
  stock: number;

  @Column({ name: 'es_activo', default: true })
  esActivo: boolean;
}
