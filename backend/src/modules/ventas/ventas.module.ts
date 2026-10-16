import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Venta } from '../../entities/venta.entity';
import { DetalleVenta } from '../../entities/detalle-venta.entity';
import { Producto } from '../../entities/producto.entity';
import { Cliente } from '../../entities/cliente.entity';
import { VentasService } from './ventas.service';
import { VentasController } from './ventas.controller';
import { AutorizacionesModule } from '../autorizaciones/autorizaciones.module';

@Module({
  imports: [TypeOrmModule.forFeature([Venta, DetalleVenta, Producto, Cliente]), AutorizacionesModule],
  controllers: [VentasController],
  providers: [VentasService],
})
export class VentasModule {}
