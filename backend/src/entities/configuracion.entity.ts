import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity({ name: 'configuracion', schema: 'inventario' })
export class Configuracion extends BaseEntity {
  @Column({ length: 100, unique: true })
  clave: string;

  @Column({ type: 'text' })
  valor: string;

  @Column({ length: 20, default: 'string' })
  tipo: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ name: 'es_sistema', default: false })
  esSistema: boolean;
}
