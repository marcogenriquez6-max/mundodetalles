import { Controller, Get, Post, Body, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { VentasService } from './ventas.service';
import { CrearVentaDto } from '../../dto/crear-venta.dto';
import { AnularVentaDto } from '../../dto/anular-venta.dto';

@ApiTags('Ventas')
@ApiBearerAuth()
@Controller('ventas')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class VentasController {
  constructor(private readonly service: VentasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar ventas', description: 'Obtiene ventas con filtros opcionales' })
  @ApiQuery({ name: 'estado', required: false, description: 'Filtrar por estado' })
  @ApiQuery({ name: 'metodoPago', required: false, description: 'Filtrar por método de pago' })
  @ApiQuery({ name: 'clienteId', required: false, description: 'Filtrar por cliente' })
  @ApiQuery({ name: 'desde', required: false, description: 'Fecha inicial (YYYY-MM-DD)' })
  @ApiQuery({ name: 'hasta', required: false, description: 'Fecha final (YYYY-MM-DD)' })
  findAll(
    @Query('estado') estado?: string,
    @Query('metodoPago') metodoPago?: string,
    @Query('clienteId') clienteId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.service.findAll({ estado, metodoPago, clienteId, desde, hasta });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de ventas', description: 'Retorna las ventas completadas agrupadas por día (hora local) de los últimos 7 días' })
  getStats() {
    return this.service.getDailySales();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener venta por ID', description: 'Retorna una venta según su identificador único' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Registrar venta',
    description:
      'Registra una venta como transacción atómica: precios del catálogo, descuento de stock y salida en Kardex. ' +
      'Con precioSolicitado la venta queda PENDIENTE hasta que el administrador responda la autorización.',
  })
  create(@Body() dto: CrearVentaDto, @Req() req: any) {
    // El usuario que registra la venta se toma del token, no del body (seguridad).
    return this.service.create(dto, req.user);
  }

  @Roles('Administrador', 'Cajero')
  @Patch(':id/anular')
  @ApiOperation({ summary: 'Anular venta', description: 'Anula una venta completada o pendiente: repone stock (Kardex) y revierte puntos' })
  anular(@Param('id') id: string, @Body() dto: AnularVentaDto, @Req() req: any) {
    return this.service.anular(id, dto.motivo, req.user.id);
  }
}
