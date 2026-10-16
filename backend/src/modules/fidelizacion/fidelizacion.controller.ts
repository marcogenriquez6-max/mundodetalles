import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FidelizacionService } from './fidelizacion.service';

@ApiTags('Fidelización')
@ApiBearerAuth()
@Controller('fidelizacion')
@UseGuards(AuthGuard('jwt'))
export class FidelizacionController {
  constructor(private readonly service: FidelizacionService) {}

  @Get('historial/:clienteId')
  @ApiOperation({ summary: 'Historial de fidelización', description: 'Obtiene el historial de puntos de un cliente' })
  historial(@Param('clienteId') clienteId: string) {
    return this.service.historial(clienteId);
  }

  @Get('resumen/:clienteId')
  @ApiOperation({ summary: 'Resumen de fidelización', description: 'Obtiene el resumen de puntos disponibles y canjeados de un cliente' })
  resumen(@Param('clienteId') clienteId: string) {
    return this.service.resumen(clienteId);
  }
}
