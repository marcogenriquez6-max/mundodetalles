import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Autorizacion } from '../../entities/autorizacion.entity';
import { DetalleVenta } from '../../entities/detalle-venta.entity';
import { AutorizacionesService } from './autorizaciones.service';
import { AutorizacionesController } from './autorizaciones.controller';
import { AutorizacionesGateway } from './autorizaciones.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Autorizacion, DetalleVenta])],
  controllers: [AutorizacionesController],
  providers: [AutorizacionesService, AutorizacionesGateway],
  exports: [AutorizacionesGateway],
})
export class AutorizacionesModule {}
