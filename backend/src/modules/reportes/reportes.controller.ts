import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportesService } from './reportes.service';
import { CrearReporteDto } from '../../dto/crear-reporte.dto';
import { ActualizarReporteDto } from '../../dto/actualizar-reporte.dto';

@ApiTags('Reportes')
@ApiBearerAuth()
@Controller('reportes')
@UseGuards(AuthGuard('jwt'))
export class ReportesController {
  constructor(private readonly service: ReportesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar reportes', description: 'Obtiene todos los reportes disponibles para el usuario' })
  findAll(@Req() req: any) {
    const usuarioId = req.user?.id;
    return this.service.findAll(usuarioId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener reporte por ID', description: 'Retorna un reporte según su identificador único' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear reporte', description: 'Registra un nuevo reporte personalizado' })
  create(@Body() dto: CrearReporteDto, @Req() req: any) {
    // El reporte pertenece a quien lo crea (si no es público, solo él lo ve en su lista).
    return this.service.create(dto, req.user?.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar reporte', description: 'Modifica los datos de un reporte existente' })
  update(@Param('id') id: string, @Body() dto: ActualizarReporteDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar reporte', description: 'Elimina lógicamente un reporte del sistema' })
  remove(@Param('id') id: string, @Req() req: any) {
    // Soft-delete con trazabilidad: deleted_by = usuario autenticado.
    return this.service.remove(id, req.user.id);
  }
}
