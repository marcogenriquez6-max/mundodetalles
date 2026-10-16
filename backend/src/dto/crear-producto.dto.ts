import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  MaxLength,
  MinLength,
  IsObject,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CrearProductoDto {
  @ApiPropertyOptional({ description: 'Código de barras del producto', example: '7501234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigoBarras?: string;

  @ApiPropertyOptional({ description: 'SKU único del producto (se genera automáticamente si se omite)', example: 'PROD-001' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  sku?: string;

  @ApiProperty({ description: 'Nombre del producto', example: 'Caja de 12 rosas rojas' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nombre: string;

  @ApiPropertyOptional({ description: 'Descripción detallada del producto', example: 'Caja con 12 rosas rojas importadas' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ description: 'Identificador de la categoría', example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsUUID()
  categoriaId: string;

  @ApiProperty({ description: 'Precio base del producto', example: 150.00 })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  precioBase: number;

  @ApiPropertyOptional({ description: 'Precio mayorista del producto', example: 120.00 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  precioMayorista?: number;

  @ApiPropertyOptional({ description: 'Costo promedio del producto', example: 80.00 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  costoPromedio?: number;

  @ApiProperty({ description: 'Stock actual disponible', example: 100 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stockActual: number;

  @ApiProperty({ description: 'Stock mínimo permitido', example: 10 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stockMinimo: number;

  @ApiPropertyOptional({ description: 'Stock máximo permitido', example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stockMaximo?: number;

  @ApiPropertyOptional({ description: 'Unidad de medida del producto', example: 'unidad' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unidadMedida?: string;

  @ApiPropertyOptional({ description: 'Atributos dinámicos adicionales', example: { color: 'rojo', tamaño: 'grande' } })
  @IsOptional()
  @IsObject()
  atributosDinamicos?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Ruta de la imagen del producto', example: '/imagenes/producto-001.jpg' })
  @IsOptional()
  @IsString()
  rutaImagen?: string;

  @ApiPropertyOptional({ description: 'Indica si el producto está activo', example: true })
  @IsOptional()
  @IsBoolean()
  esActivo?: boolean;

  @ApiPropertyOptional({ description: 'Si el producto otorga puntos de fidelización', example: true })
  @IsOptional()
  @IsBoolean()
  otorgaPuntos?: boolean;
}
