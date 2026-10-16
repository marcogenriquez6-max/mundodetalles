import {
  IsString,
  IsUUID,
  IsDateString,
  MinLength,
  MaxLength,
  IsOptional,
  IsArray,
  IsInt,
  IsNumber,
  Min,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class DetalleCotizacionDto {
  @ApiProperty({ description: 'ID del producto', example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsUUID()
  productoId: string;

  @ApiProperty({ description: 'Cantidad cotizada', example: 5 })
  @IsInt()
  @Min(1)
  cantidad: number;

  @ApiPropertyOptional({ description: 'Referencial: se usa el precio vigente del catálogo', example: 30.0 })
  @IsOptional()
  @IsNumber()
  precioUnitario?: number;
}

export class CrearCotizacionDto {
  @ApiProperty({ description: 'Código de la cotización', example: 'COT-001' })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  codigo: string;

  @ApiPropertyOptional({ description: 'ID del cliente', example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsOptional()
  @IsUUID()
  clienteId?: string;

  @ApiPropertyOptional({ description: 'Fecha de validez', example: '2026-07-22' })
  @IsOptional()
  @IsDateString({}, { message: 'fechaValidez debe ser una fecha (AAAA-MM-DD)' })
  fechaValidez?: string;

  @ApiPropertyOptional({ description: 'Observaciones', example: 'Cotización válida por 15 días' })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiProperty({ description: 'Detalles de la cotización' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DetalleCotizacionDto)
  detalles: DetalleCotizacionDto[];
}
