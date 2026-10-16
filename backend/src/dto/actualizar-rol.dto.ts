import { IsString, IsOptional, IsNumber, IsBoolean, Min, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ActualizarRolDto {
  @ApiPropertyOptional({ description: 'Nombre del rol', example: 'SUPERVISOR', minLength: 3, maxLength: 50 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  nombre?: string;

  @ApiPropertyOptional({ description: 'Descripción del rol', example: 'Supervisor con permisos avanzados' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ description: 'Nivel jerárquico del rol', example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  nivelJerarquico?: number;

  @ApiPropertyOptional({ description: 'Indica si es un rol de sistema', example: false })
  @IsOptional()
  @IsBoolean()
  esSistema?: boolean;
}
