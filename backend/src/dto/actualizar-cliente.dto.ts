import { IsString, IsOptional, IsEmail, MaxLength, MinLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

const vacioAUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * Edición de datos del cliente. Los puntos y el nivel NO se editan aquí:
 * cambian solo por ventas, canjes, anulaciones y devoluciones (con historial).
 */
export class ActualizarClienteDto {
  @ApiPropertyOptional({ description: 'Tipo de documento (Bolivia): CI o NIT', example: 'CI' })
  @IsOptional()
  @IsString()
  @Matches(/^(CI|NIT)$/, { message: 'tipoDocumento debe ser CI o NIT' })
  tipoDocumento?: string;

  @ApiPropertyOptional({ description: 'Número de documento', example: '12345678' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  numeroDocumento?: string;

  @ApiPropertyOptional({ description: 'Nombre del cliente' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre?: string;

  @ApiPropertyOptional({ description: 'Apellido del cliente' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  apellido?: string;

  @ApiPropertyOptional({ description: 'Correo electrónico' })
  @Transform(vacioAUndefined)
  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @MaxLength(180)
  email?: string;

  @ApiPropertyOptional({ description: 'Teléfono' })
  @Transform(vacioAUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @ApiPropertyOptional({ description: 'Dirección' })
  @Transform(vacioAUndefined)
  @IsOptional()
  @IsString()
  direccion?: string;
}
