import {
  IsString,
  IsOptional,
  MaxLength,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CrearConfiguracionDto {
  @ApiProperty({ description: 'Clave de configuración', example: 'TIEMPO_SESION' })
  @IsString()
  @MaxLength(100)
  clave: string;

  @ApiProperty({ description: 'Valor de la configuración', example: '60' })
  @Transform(({ value }) => (value === null || value === undefined ? value : typeof value === 'object' ? JSON.stringify(value) : String(value)))
  @IsString()
  valor: string;

  @ApiPropertyOptional({ description: 'Tipo de dato', example: 'number', enum: ['string', 'number', 'boolean', 'json'] })
  @IsOptional()
  @IsString()
  @IsIn(['string', 'number', 'boolean', 'json'])
  tipo?: string;

  @ApiPropertyOptional({ description: 'Descripción de la configuración', example: 'Tiempo de sesión en minutos' })
  @IsOptional()
  @IsString()
  descripcion?: string;
}
