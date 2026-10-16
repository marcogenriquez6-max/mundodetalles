import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ConfiguracionService } from './configuracion.service';
import { CrearConfiguracionDto } from '../../dto/crear-configuracion.dto';

@ApiTags('Configuración')
@ApiBearerAuth()
@Controller('configuracion')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ConfiguracionController {
  constructor(private readonly service: ConfiguracionService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas las configuraciones', description: 'Retorna todas las configuraciones del sistema' })
  obtenerTodos() {
    return this.service.obtenerTodos();
  }

  @Get(':clave')
  @ApiOperation({ summary: 'Obtener configuración por clave', description: 'Retorna el valor parseado de una configuración según su clave' })
  get(@Param('clave') clave: string) {
    return this.service.get(clave);
  }

  @Roles('Administrador')
  @Post()
  @ApiOperation({ summary: 'Crear o actualizar configuración', description: 'Crea o actualiza una configuración (upsert)' })
  set(@Body() dto: CrearConfiguracionDto) {
    return this.service.set(dto.clave, dto.valor, dto.tipo, dto.descripcion);
  }

  @Roles('Administrador')
  @Delete(':clave')
  @ApiOperation({ summary: 'Eliminar configuración', description: 'Elimina una configuración por su clave' })
  delete(@Param('clave') clave: string, @Req() req: any) {
    return this.service.delete(clave, req.user.id);
  }
}
