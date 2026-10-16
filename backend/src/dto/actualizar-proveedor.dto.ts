import { IsString, IsOptional, IsBoolean, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ActualizarProveedorDto {
  @ApiPropertyOptional({ description: 'Nombre del proveedor', minLength: 2, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nombre?: string;

  @ApiPropertyOptional({ description: 'Persona de contacto' })
  @IsOptional()
  @IsString()
  contacto?: string;

  @ApiPropertyOptional({ description: 'Teléfono' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({ description: 'Correo electrónico' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Dirección' })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiPropertyOptional({ description: 'NIT' })
  @IsOptional()
  @IsString()
  nit?: string;

  @ApiPropertyOptional({ description: 'Proveedor activo', example: true })
  @IsOptional()
  @IsBoolean()
  esActivo?: boolean;
}
