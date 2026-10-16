import { Entity, Column, ManyToMany, CreateDateColumn } from 'typeorm';
import { Rol } from './rol.entity';

@Entity({ name: 'permisos', schema: 'inventario' })
export class Permiso {
  @Column('uuid', { primary: true, generated: 'uuid' })
  id: string;

  @Column({ unique: true, length: 100 })
  codigo: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ nullable: true, length: 255 })
  descripcion?: string;

  @Column({ length: 50 })
  modulo: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToMany(() => Rol, (rol) => rol.permisos)
  roles: Rol[];
}
