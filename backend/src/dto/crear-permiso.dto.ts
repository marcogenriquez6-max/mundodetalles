import { IsOptional, IsString, MaxLength, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CrearPermisoDto {
  @ApiProperty({ description: 'Código único del permiso', example: 'VENTAS_CREAR', pattern: '^[A-Z_]+$' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @Matches(/^[A-Z_]+$/, { message: 'El código solo puede contener mayúsculas y guiones bajos' })
  codigo: string;

  @ApiProperty({ description: 'Nombre del permiso', example: 'Crear Ventas' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ description: 'Módulo al que pertenece', example: 'VENTAS' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  modulo: string;

  @ApiProperty({ description: 'Descripción del permiso', example: 'Permite crear nuevas ventas en el sistema', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string;
}
