import { IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CanjearPremioDto {
  @ApiProperty({ description: 'Cliente que canjea el premio', example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsUUID()
  clienteId: string;

  @ApiPropertyOptional({ description: 'Ignorado: el usuario que registra el canje se toma del token JWT' })
  @IsOptional()
  @IsUUID()
  usuarioId?: string;
}
