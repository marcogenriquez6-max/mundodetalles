import { Controller, Get, Post, Body, Param, Patch, Delete, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProductosService } from './productos.service';
import { CrearProductoDto } from '../../dto/crear-producto.dto';
import { ActualizarProductoDto } from '../../dto/actualizar-producto.dto';
import { ActualizarPrecioDto } from '../../dto/actualizar-precio.dto';

@ApiTags('Productos')
@ApiBearerAuth()
@Controller('productos')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ProductosController {
  constructor(private readonly service: ProductosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar productos', description: 'Obtiene productos con filtros opcionales' })
  @ApiQuery({ name: 'search', required: false, description: 'Búsqueda por nombre o SKU' })
  @ApiQuery({ name: 'categoriaId', required: false, description: 'Filtrar por categoría' })
  @ApiQuery({ name: 'esActivo', required: false, description: 'Filtrar por estado activo/inactivo' })
  findAll(
    @Query('search') search?: string,
    @Query('categoriaId') categoriaId?: string,
    @Query('esActivo') esActivo?: string,
  ) {
    return this.service.findAll({ search, categoriaId, esActivo: esActivo === undefined ? undefined : esActivo === 'true' });
  }

  @Get('stock-bajo')
  @ApiOperation({ summary: 'Consultar stock bajo', description: 'Obtiene productos con stock por debajo del mínimo' })
  stockBajo() {
    return this.service.buscarStockBajo();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener producto por ID', description: 'Retorna un producto según su identificador único' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles('Administrador')
  @Post()
  @ApiOperation({ summary: 'Crear producto', description: 'Registra un nuevo producto en el sistema' })
  create(@Body() dto: CrearProductoDto, @Req() req: any) {
    return this.service.create(dto, req.user.id);
  }

  @Roles('Administrador')
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar producto', description: 'Modifica los datos de un producto; una corrección de stock se registra como AJUSTE en el Kardex' })
  update(@Param('id') id: string, @Body() dto: ActualizarProductoDto, @Req() req: any) {
    return this.service.update(id, dto, req.user.id);
  }

  @Roles('Administrador')
  @Patch(':id/precio')
  @ApiOperation({ summary: 'Actualizar precio', description: 'Actualiza el precio base o mayorista de un producto' })
  actualizarPrecio(@Param('id') id: string, @Body() dto: ActualizarPrecioDto) {
    return this.service.actualizarPrecio(id, dto);
  }

  @Roles('Administrador')
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar producto', description: 'Desactiva o elimina un producto del sistema' })
  remove(@Param('id') id: string, @Req() req: any) {
    // Soft-delete con trazabilidad: deleted_by = usuario autenticado.
    return this.service.remove(id, req.user.id);
  }
}
