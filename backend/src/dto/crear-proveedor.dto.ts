import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEmail,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CrearProveedorDto {
  @ApiProperty({ description: 'Nombre del proveedor', example: 'Distribuidora XYZ' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nombre: string;

  @ApiPropertyOptional({ description: 'Nombre del contacto', example: 'María García' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  contacto?: string;

  @ApiPropertyOptional({ description: 'Teléfono del proveedor', example: '2-5251234' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  telefono?: string;

  @ApiPropertyOptional({ description: 'Correo electrónico', example: 'ventas@distribuidora.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @ApiPropertyOptional({ description: 'Dirección del proveedor', example: 'Av. 6 de Agosto 456, Oruro' })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiPropertyOptional({ description: 'NIT del proveedor', example: '1023456029' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nit?: string;

  @ApiPropertyOptional({ description: 'Indica si el proveedor está activo', example: true })
  @IsOptional()
  @IsBoolean()
  esActivo?: boolean;
}
