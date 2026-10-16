import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Producto } from './producto.entity';

@Entity({ name: 'categorias', schema: 'inventario' })
export class Categoria extends BaseEntity {
  @Column({ unique: true, length: 100 })
  nombre: string;

  @Column({ nullable: true, type: 'text' })
  descripcion?: string;

  @Column({ name: 'ruta_imagen', nullable: true, type: 'text' })
  rutaImagen?: string;

  @ManyToOne(() => Categoria, { nullable: true })
  @JoinColumn({ name: 'padre_id' })
  padre?: Categoria;

  @Column({ name: 'padre_id', nullable: true })
  padreId?: string;

  @OneToMany(() => Producto, (producto) => producto.categoria)
  productos: Producto[];
}
