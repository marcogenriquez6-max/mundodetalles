import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CrearRolDto } from '../../dto/crear-rol.dto';
import { ActualizarRolDto } from '../../dto/actualizar-rol.dto';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Administrador')
export class RolesController {
  constructor(private readonly service: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar roles', description: 'Obtiene todos los roles registrados' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener rol por ID', description: 'Retorna un rol según su identificador único' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear rol', description: 'Registra un nuevo rol en el sistema' })
  create(@Body() dto: CrearRolDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar rol', description: 'Modifica los datos de un rol existente' })
  update(@Param('id') id: string, @Body() dto: ActualizarRolDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar rol', description: 'Desactiva o elimina un rol del sistema' })
  remove(@Param('id') id: string, @Req() req: any) {
    // Soft-delete con trazabilidad: deleted_by = usuario autenticado.
    return this.service.remove(id, req.user.id);
  }
}
