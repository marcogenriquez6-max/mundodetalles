import { IsString, IsOptional, IsInt, IsBoolean, Min, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ActualizarPremioDto {
  @ApiPropertyOptional({ description: 'Nombre del premio' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nombre?: string;

  @ApiPropertyOptional({ description: 'Descripción del premio' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ description: 'Puntos necesarios para canjear' })
  @IsOptional()
  @IsInt()
  @Min(1)
  puntosRequeridos?: number;

  @ApiPropertyOptional({ description: 'Stock disponible del premio' })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ description: 'Si el premio está activo' })
  @IsOptional()
  @IsBoolean()
  esActivo?: boolean;
}
