import { Controller, Get, Post, Body, Param, Patch, Delete, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PremiosService } from './premios.service';
import { CrearPremioDto } from '../../dto/crear-premio.dto';
import { ActualizarPremioDto } from '../../dto/actualizar-premio.dto';
import { CanjearPremioDto } from '../../dto/canjear-premio.dto';

@ApiTags('Premios')
@ApiBearerAuth()
@Controller('premios')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PremiosController {
  constructor(private readonly service: PremiosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar premios' })
  @ApiQuery({ name: 'disponibles', required: false, description: 'Solo premios activos y con stock' })
  findAll(@Query('disponibles') disponibles?: string) {
    return this.service.findAll(disponibles === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un premio' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles('Administrador')
  @Post()
  @ApiOperation({ summary: 'Crear premio' })
  create(@Body() dto: CrearPremioDto) {
    return this.service.create(dto);
  }

  @Roles('Administrador')
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar premio' })
  update(@Param('id') id: string, @Body() dto: ActualizarPremioDto) {
    return this.service.update(id, dto);
  }

  @Roles('Administrador')
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar premio (soft-delete)' })
  remove(@Param('id') id: string, @Req() req: any) {
    // Soft-delete con trazabilidad: deleted_by = usuario autenticado.
    return this.service.remove(id, req.user.id);
  }

  @Roles('Administrador', 'Cajero')
  @Post(':id/canjear')
  @ApiOperation({ summary: 'Canjear premio por puntos', description: 'Valida saldo de puntos y stock del premio' })
  canjear(@Param('id') id: string, @Body() dto: CanjearPremioDto, @Req() req: any) {
    // Quien registra el canje se toma del token JWT.
    return this.service.canjear(id, dto.clienteId, req.user.id);
  }
}
