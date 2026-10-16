import { Controller, Get, Post, Body, Param, Req, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CajaService } from './caja.service';
import { AbrirCajaDto } from '../../dto/abrir-caja.dto';
import { CerrarCajaDto } from '../../dto/cerrar-caja.dto';

@ApiTags('Caja')
@ApiBearerAuth()
@Controller('caja')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CajaController {
  constructor(private readonly service: CajaService) {}

  @Get()
  @ApiOperation({ summary: 'Listar cajas', description: 'Obtiene registros de caja con filtros opcionales' })
  @ApiQuery({ name: 'estado', required: false, description: 'Filtrar por estado (ABIERTA/CERRADA)' })
  @ApiQuery({ name: 'desde', required: false, description: 'Fecha inicial (YYYY-MM-DD)' })
  @ApiQuery({ name: 'hasta', required: false, description: 'Fecha final (YYYY-MM-DD)' })
  findAll(
    @Query('estado') estado?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.service.findAll({ estado, desde, hasta });
  }

  @Get('abierta')
  @ApiOperation({ summary: 'Caja abierta', description: 'Retorna la caja actualmente abierta o null' })
  findAbierta() {
    return this.service.findAbierta();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener caja por ID', description: 'Retorna un registro de caja según su identificador' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles('Administrador', 'Cajero')
  @Post('abrir')
  @ApiOperation({ summary: 'Abrir caja', description: 'Abre una nueva caja si no hay una abierta' })
  abrir(@Body() dto: AbrirCajaDto, @Req() req: any) {
    return this.service.abrir(dto, req.user.id);
  }

  @Roles('Administrador', 'Cajero')
  @Post(':id/cerrar')
  @ApiOperation({ summary: 'Cerrar caja', description: 'Cierra la caja: calcula ingresos (ventas en efectivo) y egresos (devoluciones) del turno y registra el monto contado' })
  cerrar(@Param('id') id: string, @Body() dto: CerrarCajaDto, @Req() req: any) {
    return this.service.cerrar(id, dto, req.user.id);
  }
}
