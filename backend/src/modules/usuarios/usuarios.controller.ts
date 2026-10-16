import { Controller, Get, Post, Body, Param, Patch, Delete, Query, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import { CrearUsuarioDto } from '../../dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from '../../dto/actualizar-usuario.dto';

@ApiTags('Usuarios')
@ApiBearerAuth()
@Controller('usuarios')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Administrador')
export class UsuariosController {
  constructor(private readonly service: UsuariosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuarios', description: 'Obtiene usuarios con filtros opcionales' })
  @ApiQuery({ name: 'search', required: false, description: 'Búsqueda por nombre, apellido o email' })
  @ApiQuery({ name: 'rolId', required: false, description: 'Filtrar por rol' })
  @ApiQuery({ name: 'esActivo', required: false, description: 'Filtrar por estado activo/inactivo' })
  findAll(
    @Query('search') search?: string,
    @Query('rolId') rolId?: string,
    @Query('esActivo') esActivo?: string,
  ) {
    return this.service.findAll({ search, rolId, esActivo: esActivo === undefined ? undefined : esActivo === 'true' });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID', description: 'Retorna un usuario según su identificador único' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear usuario', description: 'Registra un nuevo usuario en el sistema' })
  create(@Body() dto: CrearUsuarioDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar usuario', description: 'Modifica los datos de un usuario existente' })
  update(@Param('id') id: string, @Body() dto: ActualizarUsuarioDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar usuario', description: 'Desactiva o elimina un usuario del sistema' })
  remove(@Param('id') id: string, @Req() req: any) {
    if (req.user?.id === id) {
      throw new BadRequestException('No puede eliminar su propia cuenta mientras está conectado.');
    }
    return this.service.remove(id, req.user.id);
  }
}
