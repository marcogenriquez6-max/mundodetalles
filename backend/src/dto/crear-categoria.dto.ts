import { IsString, IsOptional, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CrearCategoriaDto {
  @ApiProperty({ description: 'Nombre de la categoría', example: 'Regalos Corporativos', maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre: string;

  @ApiPropertyOptional({ description: 'Descripción de la categoría' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ description: 'Ruta de la imagen de la categoría' })
  @IsOptional()
  @IsString()
  rutaImagen?: string;

  @ApiPropertyOptional({ description: 'Identificador de la categoría padre', example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsOptional()
  @IsUUID()
  padreId?: string;
}
