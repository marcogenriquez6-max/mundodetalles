import { IsString, IsOptional, IsNumber, IsBoolean, Min, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CrearRolDto {
  @ApiProperty({ description: 'Nombre del rol', example: 'VENDEDOR', minLength: 3, maxLength: 50 })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  nombre: string;

  @ApiPropertyOptional({ description: 'Descripción del rol', example: 'Vendedor con permisos básicos' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ description: 'Nivel jerárquico del rol', example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  nivelJerarquico?: number;

  @ApiPropertyOptional({ description: 'Indica si es un rol de sistema', example: false })
  @IsOptional()
  @IsBoolean()
  esSistema?: boolean;
}
