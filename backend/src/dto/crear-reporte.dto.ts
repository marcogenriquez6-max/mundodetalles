import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsArray,
  IsBoolean,
  IsUUID,
  MaxLength,
  MinLength,
  ArrayUnique,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoReporte } from '../entities/reporte.entity';

export class CrearReporteDto {
  @ApiProperty({ description: 'Nombre del reporte', example: 'Ventas del día', minLength: 2, maxLength: 200 })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nombre: string;

  @ApiPropertyOptional({ description: 'Descripción del reporte', example: 'Reporte diario de ventas', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @ApiProperty({ description: 'Tipo de reporte', enum: TipoReporte, example: TipoReporte.VENTAS_DIA })
  @IsEnum(TipoReporte, { message: 'El tipo debe ser: VENTAS_DIA, VENTAS_MES, RANKING_CLIENTES, INVENTARIO o PERSONALIZADO' })
  tipo: TipoReporte;

  @ApiPropertyOptional({ description: 'Filtros del reporte en formato JSON', example: { fechaDesde: '2025-01-01', metodoPago: 'EFECTIVO' } })
  @IsOptional()
  @IsObject()
  filtros?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Columnas visibles del reporte', example: ['fecha', 'cantidad', 'total'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  columnas?: string[];

  @ApiPropertyOptional({ description: 'Compartir reporte con todos los usuarios', example: false })
  @IsOptional()
  @IsBoolean()
  esPublico?: boolean;

  @ApiPropertyOptional({ description: 'Identificador del usuario creador', example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsOptional()
  @IsUUID()
  usuarioId?: string;
}
