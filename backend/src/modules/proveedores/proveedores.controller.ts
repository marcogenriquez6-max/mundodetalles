import { Controller, Get, Post, Body, Param, Patch, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProveedoresService } from './proveedores.service';
import { CrearProveedorDto } from '../../dto/crear-proveedor.dto';
import { ActualizarProveedorDto } from '../../dto/actualizar-proveedor.dto';

@ApiTags('Proveedores')
@ApiBearerAuth()
@Controller('proveedores')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ProveedoresController {
  constructor(private readonly service: ProveedoresService) {}

  @Get()
  @ApiOperation({ summary: 'Listar proveedores', description: 'Obtiene proveedores con filtros opcionales' })
  @ApiQuery({ name: 'search', required: false, description: 'Búsqueda por nombre o NIT' })
  @ApiQuery({ name: 'esActivo', required: false, description: 'Filtrar por estado activo/inactivo' })
  findAll(
    @Query('search') search?: string,
    @Query('esActivo') esActivo?: string,
  ) {
    return this.service.findAll({ search, esActivo: esActivo === undefined ? undefined : esActivo === 'true' });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener proveedor por ID', description: 'Retorna un proveedor según su identificador único' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles('Administrador')
  @Post()
  @ApiOperation({ summary: 'Crear proveedor', description: 'Registra un nuevo proveedor en el sistema' })
  create(@Body() dto: CrearProveedorDto) {
    return this.service.create(dto);
  }

  @Roles('Administrador')
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar proveedor', description: 'Modifica los datos de un proveedor existente' })
  update(@Param('id') id: string, @Body() dto: ActualizarProveedorDto) {
    return this.service.update(id, dto);
  }

  @Roles('Administrador')
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar proveedor', description: 'Elimina un proveedor del sistema' })
  remove(@Param('id') id: string, @Req() req: any) {
    // Soft-delete con trazabilidad: deleted_by = usuario autenticado.
    return this.service.remove(id, req.user.id);
  }
}
