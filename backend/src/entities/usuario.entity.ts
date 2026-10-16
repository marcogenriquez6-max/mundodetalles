import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from './base.entity';
import { Rol } from './rol.entity';
import { Venta } from './venta.entity';
import { Autorizacion } from './autorizacion.entity';

@Entity({ name: 'usuarios', schema: 'inventario' })
export class Usuario extends BaseEntity {
  @Column({ unique: true, length: 180 })
  email: string;

  @Column({ unique: true, length: 50 })
  username: string;

  @Exclude({ toPlainOnly: true })
  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 100 })
  apellido: string;

  @Column({ nullable: true, length: 20 })
  telefono?: string;

  @ManyToOne(() => Rol, (rol) => rol.usuarios)
  @JoinColumn({ name: 'rol_id' })
  rol: Rol;

  @Column({ name: 'rol_id' })
  rolId: string;

  @Exclude({ toPlainOnly: true })
  @Column({ name: 'refresh_token', nullable: true, type: 'text' })
  refreshToken?: string;

  @Column({ name: 'es_activo', default: true })
  esActivo: boolean;

  @Column({ name: 'ultimo_acceso', type: 'timestamptz', nullable: true })
  ultimoAcceso?: Date;

  @OneToMany(() => Venta, (venta) => venta.usuario)
  ventas: Venta[];

  @OneToMany(() => Autorizacion, (auth) => auth.solicitante)
  solicitudes: Autorizacion[];

  @OneToMany(() => Autorizacion, (auth) => auth.aprobador)
  aprobaciones: Autorizacion[];
}
