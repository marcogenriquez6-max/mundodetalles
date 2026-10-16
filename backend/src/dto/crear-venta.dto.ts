import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  Min,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class DetalleVentaDto {
  @ApiProperty({ description: 'Identificador del producto', example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsUUID()
  productoId: string;

  @ApiProperty({ description: 'Cantidad del producto', example: 2 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  cantidad: number;

  @ApiPropertyOptional({
    description: 'Referencial. El servidor usa SIEMPRE el precio vigente del catálogo (evita la manipulación de precios).',
    example: 75.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  precioUnitario?: number;
}

export class CrearVentaDto {
  @ApiProperty({ description: 'Código del comprobante', example: 'NV-000001' })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  codigoComprobante: string;

  @ApiPropertyOptional({ description: 'Tipo de comprobante (Bolivia): NOTA_VENTA, FACTURA o NOTA_CREDITO_DEBITO', example: 'NOTA_VENTA' })
  @IsOptional()
  @IsString()
  @Matches(/^(NOTA_VENTA|FACTURA|NOTA_CREDITO_DEBITO)$/, { message: 'tipoComprobante debe ser NOTA_VENTA, FACTURA o NOTA_CREDITO_DEBITO' })
  tipoComprobante?: string;

  @ApiPropertyOptional({ description: 'Identificador del cliente', example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsOptional()
  @IsUUID()
  clienteId?: string;

  @ApiPropertyOptional({ description: 'Ignorado: el usuario que registra la venta se toma del token JWT' })
  @IsOptional()
  @IsUUID()
  usuarioId?: string;

  @ApiPropertyOptional({ description: 'Referencial: el subtotal se calcula en el servidor', example: 150.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  subtotal?: number;

  @ApiPropertyOptional({ description: 'Referencial: el descuento solo se aplica mediante autorización', example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  descuento?: number;

  @ApiPropertyOptional({ description: 'Referencial: el impuesto se calcula con la configuración del negocio', example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  impuesto?: number;

  @ApiPropertyOptional({ description: 'Referencial: el total se calcula en el servidor', example: 158.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  total?: number;

  @ApiPropertyOptional({ description: 'Método de pago', example: 'EFECTIVO' })
  @IsOptional()
  @IsString()
  @Matches(/^(EFECTIVO|QR|TRANSFERENCIA|TARJETA)$/)
  metodoPago?: string;

  @ApiPropertyOptional({
    description:
      'Precio total negociado (menor al subtotal). Si se envía, la venta queda PENDIENTE hasta que el administrador lo autorice.',
    example: 140.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  precioSolicitado?: number;

  @ApiPropertyOptional({ description: 'Motivo del precio negociado (obligatorio si se envía precioSolicitado)', example: 'Cliente frecuente, compra por volumen' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivoDescuento?: string;

  @ApiProperty({ description: 'Detalle de los productos incluidos en la venta', type: [DetalleVentaDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DetalleVentaDto)
  detalles: DetalleVentaDto[];
}
