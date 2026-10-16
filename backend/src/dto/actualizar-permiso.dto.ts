import { IsString, IsOptional, MaxLength, MinLength, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ActualizarPermisoDto {
  @ApiPropertyOptional({ description: 'Código único del permiso', pattern: '^[A-Z_]+$' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @Matches(/^[A-Z_]+$/, { message: 'El código solo puede contener mayúsculas y guiones bajos' })
  codigo?: string;

  @ApiPropertyOptional({ description: 'Nombre del permiso' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  nombre?: string;

  @ApiPropertyOptional({ description: 'Módulo al que pertenece' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  modulo?: string;

  @ApiPropertyOptional({ description: 'Descripción del permiso' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string;
}
