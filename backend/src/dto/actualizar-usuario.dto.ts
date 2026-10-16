import { IsString, IsOptional, IsEmail, IsUUID, IsBoolean, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ActualizarUsuarioDto {
  @ApiPropertyOptional({ description: 'Correo electrónico', example: 'nuevo@mundodetalles.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Nombre de usuario', example: 'nvendedor', minLength: 3, maxLength: 50 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username?: string;

  @ApiPropertyOptional({ description: 'Nombre', example: 'Juan' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre?: string;

  @ApiPropertyOptional({ description: 'Apellido', example: 'Pérez' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  apellido?: string;

  @ApiPropertyOptional({ description: 'Teléfono', example: '12345678' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({ description: 'Identificador del rol', example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsOptional()
  @IsUUID()
  rolId?: string;

  @ApiPropertyOptional({ description: 'Contraseña (solo si se desea cambiar)', example: 'NuevaPass123!', minLength: 6 })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ description: 'Estado activo/inactivo', example: true })
  @IsOptional()
  @IsBoolean()
  esActivo?: boolean;
}
