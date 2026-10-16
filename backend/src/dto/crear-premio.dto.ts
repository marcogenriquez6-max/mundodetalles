import { IsString, IsOptional, IsInt, IsBoolean, Min, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CrearPremioDto {
  @ApiProperty({ description: 'Nombre del premio', example: 'Taza personalizada' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nombre: string;

  @ApiPropertyOptional({ description: 'Descripción del premio' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ description: 'Puntos necesarios para canjear el premio', example: 100 })
  @IsInt()
  @Min(1)
  puntosRequeridos: number;

  @ApiProperty({ description: 'Stock disponible del premio', example: 10 })
  @IsInt()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({ description: 'Si el premio está activo', example: true })
  @IsOptional()
  @IsBoolean()
  esActivo?: boolean;
}
