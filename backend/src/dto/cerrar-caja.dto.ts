import { IsOptional, IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CerrarCajaDto {
  @ApiProperty({ description: 'Monto final de la caja', example: 1500.00 })
  @IsNumber()
  @Min(0)
  montoFinal: number;

  @ApiPropertyOptional({ description: 'Observaciones de cierre', example: 'Cierre de turno' })
  @IsOptional()
  @IsString()
  observaciones?: string;
}
