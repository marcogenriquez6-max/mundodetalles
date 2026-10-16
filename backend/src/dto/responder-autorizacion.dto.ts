import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  MaxLength,
  IsUUID,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResponderAutorizacionDto {
  @ApiProperty({ description: 'Identificador de la autorización', example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsUUID()
  autorizacionId: string;

  @ApiPropertyOptional({ description: 'Ignorado: el aprobador es el administrador autenticado (token JWT)' })
  @IsOptional()
  @IsUUID()
  aprobadorId?: string;

  @ApiProperty({ description: 'Nuevo estado de la autorización', example: 'APROBADA' })
  @IsString()
  @Matches(/^(APROBADA|RECHAZADA)$/)
  estado: string;

  @ApiPropertyOptional({ description: 'Precio total aprobado; si se omite al aprobar, se usa el precio solicitado', example: 100.00 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  precioAprobado?: number;

  @ApiPropertyOptional({ description: 'Motivo de la respuesta', example: 'Autorizado por gerencia' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivoRespuesta?: string;
}
