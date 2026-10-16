import { Controller, Get, Post, Body, Param, Patch, Delete, Req, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CotizacionesService } from './cotizaciones.service';
import { CrearCotizacionDto } from '../../dto/crear-cotizacion.dto';
import { ActualizarCotizacionDto } from '../../dto/actualizar-cotizacion.dto';

@ApiTags('Cotizaciones')
@ApiBearerAuth()
@Controller('cotizaciones')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CotizacionesController {
  constructor(private readonly service: CotizacionesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar cotizaciones', description: 'Obtiene cotizaciones con filtros opcionales' })
  @ApiQuery({ name: 'estado', required: false, description: 'Filtrar por estado' })
  @ApiQuery({ name: 'clienteId', required: false, description: 'Filtrar por cliente' })
  @ApiQuery({ name: 'desde', required: false, description: 'Fecha inicial (YYYY-MM-DD)' })
  @ApiQuery({ name: 'hasta', required: false, description: 'Fecha final (YYYY-MM-DD)' })
  findAll(
    @Query('estado') estado?: string,
    @Query('clienteId') clienteId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.service.findAll({ estado, clienteId, desde, hasta });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cotización por ID', description: 'Retorna una cotización según su identificador único' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear cotización', description: 'Registra una nueva cotización con sus detalles' })
  create(@Body() dto: CrearCotizacionDto, @Req() req: any) {
    return this.service.create(dto, req.user?.id);
  }

  @Roles('Administrador', 'Cajero')
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar cotización', description: 'Modifica los datos de una cotización existente' })
  update(@Param('id') id: string, @Body() dto: ActualizarCotizacionDto) {
    return this.service.update(id, dto);
  }

  @Roles('Administrador')
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar cotización', description: 'Elimina una cotización del sistema' })
  remove(@Param('id') id: string, @Req() req: any) {
    // Soft-delete con trazabilidad: deleted_by = usuario autenticado.
    return this.service.remove(id, req.user.id);
  }
}
