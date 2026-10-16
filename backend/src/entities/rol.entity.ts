import {
  Entity,
  Column,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Usuario } from './usuario.entity';
import { Permiso } from './permiso.entity';

@Entity({ name: 'roles', schema: 'inventario' })
export class Rol extends BaseEntity {
  @Column({ unique: true, length: 50 })
  nombre: string;

  @Column({ nullable: true, length: 255 })
  descripcion?: string;

  @Column({ name: 'nivel_jerarquico', type: 'smallint', default: 0 })
  nivelJerarquico: number;

  @Column({ name: 'es_sistema', default: false })
  esSistema: boolean;

  @OneToMany(() => Usuario, (usuario) => usuario.rol)
  usuarios: Usuario[];

  @ManyToMany(() => Permiso, (permiso) => permiso.roles)
  @JoinTable({
    name: 'roles_permisos',
    schema: 'inventario',
    joinColumn: { name: 'rol_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permiso_id', referencedColumnName: 'id' },
  })
  permisos: Permiso[];
}
