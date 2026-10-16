import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ActualizarPrecioDto {
  @ApiPropertyOptional({ description: 'Ignorado: el producto se indica en la ruta /productos/:id/precio' })
  @IsOptional()
  @IsUUID()
  productoId?: string;

  @ApiPropertyOptional({ description: 'Nuevo precio base', example: 160.00 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  precioBase?: number;

  @ApiPropertyOptional({ description: 'Nuevo precio mayorista', example: 130.00 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  precioMayorista?: number;

  @ApiPropertyOptional({ description: 'Motivo del cambio de precio', example: 'Actualización por incremento de costos' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  motivo?: string;
}
