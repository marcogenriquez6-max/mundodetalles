import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Categoria } from './categoria.entity';

@Entity({ name: 'productos', schema: 'inventario' })
export class Producto extends BaseEntity {
  @Column({ name: 'codigo_barras', nullable: true, length: 50 })
  codigoBarras?: string;

  @Column({ unique: true, length: 100 })
  sku: string;

  @Column({ length: 200 })
  nombre: string;

  @Column({ nullable: true, type: 'text' })
  descripcion?: string;

  @ManyToOne(() => Categoria, (cat) => cat.productos)
  @JoinColumn({ name: 'categoria_id' })
  categoria: Categoria;

  @Column({ name: 'categoria_id' })
  categoriaId: string;

  @Column({ name: 'precio_base', type: 'decimal', precision: 12, scale: 2 })
  precioBase: number;

  @Column({ name: 'precio_mayorista', type: 'decimal', precision: 12, scale: 2, nullable: true })
  precioMayorista?: number;

  @Column({ name: 'costo_promedio', type: 'decimal', precision: 12, scale: 2, nullable: true })
  costoPromedio?: number;

  @Column({ name: 'stock_actual', default: 0 })
  stockActual: number;

  @Column({ name: 'stock_minimo', default: 0 })
  stockMinimo: number;

  @Column({ name: 'stock_maximo', default: 0 })
  stockMaximo: number;

  @Column({ name: 'unidad_medida', length: 20, default: 'unidad' })
  unidadMedida: string;

  @Column({ name: 'atributos_dinamicos', type: 'jsonb', default: {} })
  atributosDinamicos: Record<string, unknown>;

  @Column({ name: 'ruta_imagen', nullable: true, type: 'text' })
  rutaImagen?: string;

  @Column({ name: 'es_activo', default: true })
  esActivo: boolean;

  @Column({ name: 'otorga_puntos', default: false })
  otorgaPuntos: boolean;
}
