import {
  IsString,
  IsOptional,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const vacioAUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class CrearClienteDto {
  @ApiPropertyOptional({ description: 'Tipo de documento del cliente (Bolivia)', example: 'CI' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^(CI|NIT)$/, {
    message: 'tipoDocumento debe ser CI o NIT',
  })
  tipoDocumento?: string;

  @ApiProperty({ description: 'Número de documento del cliente', example: '12345678' })
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  numeroDocumento: string;

  @ApiProperty({ description: 'Nombre del cliente', example: 'Juan' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ description: 'Apellido del cliente', example: 'Pérez' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  apellido: string;

  @ApiPropertyOptional({ description: 'Correo electrónico del cliente', example: 'juan@example.com' })
  @Transform(vacioAUndefined)
  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @MaxLength(180)
  email?: string;

  @ApiPropertyOptional({ description: 'Teléfono del cliente', example: '68011223' })
  @Transform(vacioAUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @ApiPropertyOptional({ description: 'Dirección del cliente', example: 'Calle Bolívar 123, Oruro' })
  @Transform(vacioAUndefined)
  @IsOptional()
  @IsString()
  direccion?: string;
}
