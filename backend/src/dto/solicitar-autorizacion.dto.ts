import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SolicitarAutorizacionDto {
  @ApiPropertyOptional({ description: 'Identificador del detalle de venta asociado', example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsOptional()
  @IsUUID()
  detalleVentaId?: string;

  @ApiProperty({ description: 'Identificador de la venta', example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsUUID()
  ventaId: string;

  @ApiPropertyOptional({ description: 'Ignorado: el solicitante se toma del token JWT' })
  @IsOptional()
  @IsUUID()
  solicitanteId?: string;

  @ApiProperty({ description: 'Tipo de autorización solicitada', example: 'DESCUENTO_ESPECIAL' })
  @IsString()
  @Matches(/^(DESCUENTO_ESPECIAL|PRECIO_ESPECIAL|CREDITO|ANULACION)$/)
  tipo: string;

  @ApiPropertyOptional({ description: 'Precio solicitado (para precio especial)', example: 100.00 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  precioSolicitado?: number;

  @ApiProperty({ description: 'Motivo de la solicitud', example: 'Cliente frecuente solicita descuento especial por volumen de compra' })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  motivoSolicitud: string;
}
