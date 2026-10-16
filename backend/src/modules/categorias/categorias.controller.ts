import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CategoriasService } from './categorias.service';
import { CrearCategoriaDto } from '../../dto/crear-categoria.dto';
import { ActualizarCategoriaDto } from '../../dto/actualizar-categoria.dto';

@ApiTags('Categorías')
@ApiBearerAuth()
@Controller('categorias')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CategoriasController {
  constructor(private readonly service: CategoriasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar categorías', description: 'Obtiene todas las categorías registradas' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener categoría por ID', description: 'Retorna una categoría según su identificador único' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles('Administrador')
  @Post()
  @ApiOperation({ summary: 'Crear categoría', description: 'Registra una nueva categoría en el sistema' })
  create(@Body() dto: CrearCategoriaDto) {
    return this.service.create(dto);
  }

  @Roles('Administrador')
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar categoría', description: 'Modifica los datos de una categoría existente' })
  update(@Param('id') id: string, @Body() dto: ActualizarCategoriaDto) {
    return this.service.update(id, dto);
  }

  @Roles('Administrador')
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar categoría', description: 'Desactiva o elimina una categoría del sistema' })
  remove(@Param('id') id: string, @Req() req: any) {
    // Soft-delete con trazabilidad: deleted_by = usuario autenticado.
    return this.service.remove(id, req.user.id);
  }
}
