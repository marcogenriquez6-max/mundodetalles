import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { KardexService } from './kardex.service';
import { CrearKardexDto } from '../../dto/crear-kardex.dto';

@ApiTags('Kardex')
@ApiBearerAuth()
@Controller('kardex')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class KardexController {
  constructor(private readonly service: KardexService) {}

  @Get()
  @ApiOperation({ summary: 'Listar movimientos', description: 'Obtiene todos los movimientos de kardex' })
  @ApiQuery({ name: 'productoId', required: false })
  @ApiQuery({ name: 'tipoMovimiento', required: false })
  @ApiQuery({ name: 'fechaInicio', required: false })
  @ApiQuery({ name: 'fechaFin', required: false })
  findAll(
    @Query('productoId') productoId?: string,
    @Query('tipoMovimiento') tipoMovimiento?: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    return this.service.findAll({ productoId, tipoMovimiento, fechaInicio, fechaFin });
  }

  @Get('producto/:productoId')
  @ApiOperation({ summary: 'Movimientos por producto', description: 'Obtiene todos los movimientos de un producto ordenados por fecha descendente' })
  obtenerPorProducto(@Param('productoId') productoId: string) {
    return this.service.obtenerPorProducto(productoId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener movimiento por ID', description: 'Retorna un movimiento de kardex según su identificador' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles('Administrador')
  @Post()
  @ApiOperation({
    summary: 'Registrar movimiento manual',
    description: 'Ingreso de mercadería (ENTRADA), merma (SALIDA) o ajuste por conteo (AJUSTE); actualiza el stock del producto en la misma transacción',
  })
  create(@Body() dto: CrearKardexDto, @Req() req: any) {
    return this.service.create(dto, req.user.id);
  }
}
