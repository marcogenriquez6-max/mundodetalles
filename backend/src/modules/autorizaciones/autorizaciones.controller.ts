import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AutorizacionesService } from './autorizaciones.service';
import { SolicitarAutorizacionDto } from '../../dto/solicitar-autorizacion.dto';
import { ResponderAutorizacionDto } from '../../dto/responder-autorizacion.dto';

@ApiTags('Autorizaciones')
@ApiBearerAuth()
@Controller('autorizaciones')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AutorizacionesController {
  constructor(private readonly service: AutorizacionesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar autorizaciones', description: 'Obtiene autorizaciones con filtros opcionales' })
  @ApiQuery({ name: 'estado', required: false, description: 'Filtrar por estado' })
  @ApiQuery({ name: 'tipo', required: false, description: 'Filtrar por tipo' })
  findAll(
    @Query('estado') estado?: string,
    @Query('tipo') tipo?: string,
  ) {
    return this.service.findAll({ estado, tipo });
  }

  @Get('pendientes')
  @ApiOperation({ summary: 'Autorizaciones pendientes', description: 'Obtiene todas las autorizaciones pendientes de respuesta' })
  pendientes() {
    return this.service.pendientes();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener autorización por ID', description: 'Retorna una autorización según su identificador único' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('solicitar')
  @ApiOperation({ summary: 'Solicitar autorización', description: 'Crea una nueva solicitud de autorización' })
  solicitar(@Body() dto: SolicitarAutorizacionDto, @Req() req: any) {
    // El solicitante se toma del token JWT, no del cuerpo de la petición.
    return this.service.solicitar(dto, req.user.id);
  }

  @Roles('Administrador')
  @Post('responder')
  @ApiOperation({ summary: 'Responder autorización', description: 'Aprueba (con el precio solicitado o uno modificado) o rechaza la solicitud; la venta pendiente se completa en la misma transacción' })
  responder(@Body() dto: ResponderAutorizacionDto, @Req() req: any) {
    // El aprobador es el administrador autenticado (token JWT).
    return this.service.responder(dto, req.user.id);
  }
}
