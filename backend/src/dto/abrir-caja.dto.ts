import { IsOptional, IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AbrirCajaDto {
  @ApiProperty({ description: 'Monto inicial de la caja', example: 500.00 })
  @IsNumber()
  @Min(0)
  montoInicial: number;

  @ApiPropertyOptional({ description: 'Observaciones de apertura', example: 'Apertura de turno mañana' })
  @IsOptional()
  @IsString()
  observaciones?: string;
}
