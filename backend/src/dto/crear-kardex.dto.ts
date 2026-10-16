import { IsString, IsOptional, IsInt, IsNumber, IsUUID, Min, MaxLength, IsIn, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Movimiento manual de inventario (ingreso de mercadería, salida por merma o
 * ajuste por conteo físico). El servidor calcula el stock anterior y el nuevo,
 * actualiza el producto y registra el movimiento en una sola transacción.
 */
export class CrearKardexDto {
  @ApiProperty({ description: 'Producto', example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsUUID()
  productoId: string;

  @ApiProperty({ description: 'ENTRADA (compra), SALIDA (merma) o AJUSTE (conteo físico)', example: 'ENTRADA' })
  @IsString()
  @IsIn(['ENTRADA', 'SALIDA', 'AJUSTE'])
  tipoMovimiento: string;

  @ApiPropertyOptional({ description: 'Unidades que entran o salen (obligatorio en ENTRADA y SALIDA)', example: 10 })
  @ValidateIf((o) => o.tipoMovimiento !== 'AJUSTE')
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cantidad?: number;

  @ApiPropertyOptional({ description: 'Solo en AJUSTE: existencias reales contadas', example: 12 })
  @ValidateIf((o) => o.tipoMovimiento === 'AJUSTE')
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockNuevo?: number;

  @ApiPropertyOptional({ description: 'Costo unitario de compra (ENTRADA): actualiza el costo promedio ponderado', example: 35.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costoUnitario?: number;

  @ApiPropertyOptional({ description: 'Referencia del documento (p. ej. COMPRA, MERMA)', example: 'COMPRA' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  referencia?: string;

  @ApiPropertyOptional({ description: 'Observación (proveedor, factura, motivo)', example: 'Factura 1234 - Distribuidora Andina' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacion?: string;
}
