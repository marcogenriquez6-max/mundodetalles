import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsArray,
  IsBoolean,
  MaxLength,
  MinLength,
  ArrayUnique,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoReporte } from '../entities/reporte.entity';

export class ActualizarReporteDto {
  @ApiPropertyOptional({ description: 'Nombre del reporte', example: 'Ventas del día actualizado', minLength: 2, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nombre?: string;

  @ApiPropertyOptional({ description: 'Descripción del reporte', example: 'Reporte diario actualizado', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @ApiPropertyOptional({ description: 'Tipo de reporte', enum: TipoReporte, example: TipoReporte.VENTAS_MES })
  @IsOptional()
  @IsEnum(TipoReporte, { message: 'El tipo debe ser: VENTAS_DIA, VENTAS_MES, RANKING_CLIENTES, INVENTARIO o PERSONALIZADO' })
  tipo?: TipoReporte;

  @ApiPropertyOptional({ description: 'Filtros del reporte en formato JSON', example: { fechaDesde: '2025-01-01', fechaHasta: '2025-12-31' } })
  @IsOptional()
  @IsObject()
  filtros?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Columnas visibles del reporte', example: ['fecha', 'cantidad', 'total', 'cliente'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  columnas?: string[];

  @ApiPropertyOptional({ description: 'Compartir reporte con todos los usuarios', example: true })
  @IsOptional()
  @IsBoolean()
  esPublico?: boolean;
}
