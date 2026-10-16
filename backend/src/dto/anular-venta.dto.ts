import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnularVentaDto {
  @ApiProperty({ description: 'Motivo de la anulación', example: 'Cliente desistió de la compra' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  motivo: string;

  @ApiPropertyOptional({ description: 'Ignorado: el usuario se toma del token JWT' })
  @IsOptional()
  @IsUUID()
  usuarioId?: string;
}
