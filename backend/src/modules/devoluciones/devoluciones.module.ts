import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Devolucion } from '../../entities/devolucion.entity';
import { DetalleDevolucion } from '../../entities/detalle-devolucion.entity';
import { Producto } from '../../entities/producto.entity';
import { Kardex } from '../../entities/kardex.entity';
import { DevolucionesService } from './devoluciones.service';
import { DevolucionesController } from './devoluciones.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Devolucion, DetalleDevolucion, Producto, Kardex])],
  controllers: [DevolucionesController],
  providers: [DevolucionesService],
})
export class DevolucionesModule {}
