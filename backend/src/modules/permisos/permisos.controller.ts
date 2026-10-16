import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PermisosService } from './permisos.service';
import { CrearPermisoDto } from '../../dto/crear-permiso.dto';
import { ActualizarPermisoDto } from '../../dto/actualizar-permiso.dto';

@ApiTags('Permisos')
@ApiBearerAuth()
@Controller('permisos')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Administrador')
export class PermisosController {
  constructor(private readonly service: PermisosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar permisos', description: 'Obtiene todos los permisos registrados' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener permiso por ID', description: 'Retorna un permiso según su identificador único' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear permiso', description: 'Registra un nuevo permiso en el sistema' })
  create(@Body() dto: CrearPermisoDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar permiso', description: 'Modifica los datos de un permiso existente' })
  update(@Param('id') id: string, @Body() dto: ActualizarPermisoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar permiso', description: 'Elimina un permiso del sistema' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
