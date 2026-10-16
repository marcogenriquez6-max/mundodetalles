import {
  IsIn,
  IsString, IsOptional, IsUUID, IsNumber, Min, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ActualizarCotizacionDto {
  @ApiPropertyOptional({ description: 'Código de cotización', example: 'COT-002' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  codigo?: string;

  @ApiPropertyOptional({ description: 'Identificador del cliente' })
  @IsOptional()
  @IsUUID()
  clienteId?: string;

  @ApiPropertyOptional({ description: 'Fecha de validez', example: '2026-07-15' })
  @IsOptional()
  @IsString()
  fechaValidez?: string;

  @ApiPropertyOptional({ description: 'Estado de la cotización' })
  @IsOptional()
  @IsString()
  @IsIn(['PENDIENTE', 'APROBADA', 'RECHAZADA', 'VENCIDA'])
  estado?: string;

  @ApiPropertyOptional({ description: 'Observaciones' })
  @IsOptional()
  @IsString()
  observaciones?: string;
}
