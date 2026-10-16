import {
  IsString,
  IsUUID,
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

class DetalleDevolucionDto {
  @ApiProperty({ description: 'ID del producto', example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsUUID()
  productoId: string;

  @ApiProperty({ description: 'Cantidad a devolver', example: 2 })
  @IsInt()
  @Min(1)
  cantidad: number;

  @ApiPropertyOptional({ description: 'Referencial: se valoriza al precio cobrado en la venta original', example: 25.0 })
  @IsOptional()
  @IsNumber()
  precioUnitario?: number;
}

export class CrearDevolucionDto {
  @ApiProperty({ description: 'ID de la venta original', example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsUUID()
  ventaId: string;

  @ApiProperty({ description: 'Código de la devolución', example: 'DEV-001' })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  codigo: string;

  @ApiProperty({ description: 'Motivo de la devolución', example: 'Producto defectuoso' })
  @IsString()
  @MinLength(3)
  motivo: string;

  @ApiProperty({ description: 'Detalles de los productos devueltos' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DetalleDevolucionDto)
  detalles: DetalleDevolucionDto[];
}
