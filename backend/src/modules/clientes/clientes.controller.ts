import { Controller, Get, Post, Body, Param, Patch, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ClientesService } from './clientes.service';
import { CrearClienteDto } from '../../dto/crear-cliente.dto';
import { ActualizarClienteDto } from '../../dto/actualizar-cliente.dto';

@ApiTags('Clientes')
@ApiBearerAuth()
@Controller('clientes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ClientesController {
  constructor(private readonly service: ClientesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar clientes', description: 'Obtiene clientes con filtros opcionales' })
  @ApiQuery({ name: 'search', required: false, description: 'Búsqueda por nombre, apellido o documento' })
  @ApiQuery({ name: 'nivelFidelizacion', required: false, description: 'Filtrar por nivel (BRONCE/PLATA/ORO/PLATINO)' })
  @ApiQuery({ name: 'tipoDocumento', required: false, description: 'Filtrar por tipo de documento' })
  findAll(
    @Query('search') search?: string,
    @Query('nivelFidelizacion') nivelFidelizacion?: string,
    @Query('tipoDocumento') tipoDocumento?: string,
  ) {
    return this.service.findAll({ search, nivelFidelizacion, tipoDocumento });
  }

  @Get('documento/:numeroDocumento')
  @ApiOperation({ summary: 'Buscar cliente por documento', description: 'Retorna un cliente según su número de documento' })
  findByDocumento(@Param('numeroDocumento') nd: string) {
    return this.service.findByDocumento(nd);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cliente por ID', description: 'Retorna un cliente según su identificador único' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear cliente', description: 'Registra un nuevo cliente en el sistema' })
  create(@Body() dto: CrearClienteDto) {
    return this.service.create(dto);
  }

  @Roles('Administrador', 'Cajero')
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar cliente', description: 'Modifica los datos de un cliente existente' })
  update(@Param('id') id: string, @Body() dto: ActualizarClienteDto) {
    return this.service.update(id, dto);
  }

  @Roles('Administrador')
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar cliente', description: 'Desactiva o elimina un cliente del sistema' })
  remove(@Param('id') id: string, @Req() req: any) {
    // Soft-delete con trazabilidad: deleted_by = usuario autenticado.
    return this.service.remove(id, req.user.id);
  }
}
