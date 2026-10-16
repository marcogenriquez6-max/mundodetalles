import {
  IsString, IsNumber, IsOptional, IsUUID, IsObject, IsBoolean, Min, MaxLength, MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ActualizarProductoDto {
  @ApiPropertyOptional({ description: 'Código de barras', example: '7501234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigoBarras?: string;

  @ApiPropertyOptional({ description: 'SKU', example: 'PROD-002', minLength: 3, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  sku?: string;

  @ApiPropertyOptional({ description: 'Nombre del producto', minLength: 2, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nombre?: string;

  @ApiPropertyOptional({ description: 'Descripción del producto' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ description: 'Identificador de la categoría' })
  @IsOptional()
  @IsUUID()
  categoriaId?: string;

  @ApiPropertyOptional({ description: 'Precio base', example: 150.00 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  precioBase?: number;

  @ApiPropertyOptional({ description: 'Precio mayorista', example: 120.00 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  precioMayorista?: number;

  @ApiPropertyOptional({ description: 'Costo promedio', example: 80.00 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  costoPromedio?: number;

  @ApiPropertyOptional({ description: 'Stock actual', example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stockActual?: number;

  @ApiPropertyOptional({ description: 'Stock mínimo', example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stockMinimo?: number;

  @ApiPropertyOptional({ description: 'Stock máximo', example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stockMaximo?: number;

  @ApiPropertyOptional({ description: 'Unidad de medida', example: 'unidad' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unidadMedida?: string;

  @ApiPropertyOptional({ description: 'Atributos dinámicos', example: { color: 'rojo', talla: 'M' } })
  @IsOptional()
  @IsObject()
  atributosDinamicos?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Ruta de imagen' })
  @IsOptional()
  @IsString()
  rutaImagen?: string;

  @ApiPropertyOptional({ description: 'Producto activo', example: true })
  @IsOptional()
  @IsBoolean()
  esActivo?: boolean;

  @ApiPropertyOptional({ description: 'Si el producto otorga puntos de fidelización', example: true })
  @IsOptional()
  @IsBoolean()
  otorgaPuntos?: boolean;
}
