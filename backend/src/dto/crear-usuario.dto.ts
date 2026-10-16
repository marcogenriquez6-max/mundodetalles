import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsUUID,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CrearUsuarioDto {
  @ApiProperty({ description: 'Correo electrónico del usuario', example: 'usuario@example.com' })
  @IsEmail()
  @MaxLength(180)
  email: string;

  @ApiProperty({ description: 'Nombre de usuario único', example: 'jperez' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'username solo puede contener letras, números, guiones y guiones bajos',
  })
  username: string;

  @ApiProperty({ description: 'Contraseña del usuario (debe contener mayúsculas, minúsculas y números)', example: 'Abcd1234' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'password debe contener mayúsculas, minúsculas y números',
  })
  password: string;

  @ApiProperty({ description: 'Nombre del usuario', example: 'Juan' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ description: 'Apellido del usuario', example: 'Pérez' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  apellido: string;

  @ApiPropertyOptional({ description: 'Teléfono del usuario', example: '71234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @ApiProperty({ description: 'Identificador del rol asignado', example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsUUID()
  rolId: string;
}
