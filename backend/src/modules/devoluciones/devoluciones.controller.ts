import { Controller, Get, Post, Body, Param, Req, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DevolucionesService } from './devoluciones.service';
import { CrearDevolucionDto } from '../../dto/crear-devolucion.dto';

@ApiTags('Devoluciones')
@ApiBearerAuth()
@Controller('devoluciones')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DevolucionesController {
  constructor(private readonly service: DevolucionesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar devoluciones', description: 'Obtiene devoluciones con filtros opcionales' })
  @ApiQuery({ name: 'estado', required: false, description: 'Filtrar por estado' })
  @ApiQuery({ name: 'ventaId', required: false, description: 'Filtrar por venta' })
  @ApiQuery({ name: 'desde', required: false, description: 'Fecha inicial (YYYY-MM-DD)' })
  @ApiQuery({ name: 'hasta', required: false, description: 'Fecha final (YYYY-MM-DD)' })
  findAll(
    @Query('estado') estado?: string,
    @Query('ventaId') ventaId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.service.findAll({ estado, ventaId, desde, hasta });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener devolución por ID', description: 'Retorna una devolución según su identificador único' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles('Administrador', 'Cajero')
  @Post()
  @ApiOperation({ summary: 'Crear devolución', description: 'Registra una nueva devolución, actualiza stock y genera movimiento de kardex' })
  create(@Body() dto: CrearDevolucionDto, @Req() req: any) {
    return this.service.create(dto, req.user.id);
  }
}
