import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Producto } from '../../entities/producto.entity';
import { Kardex } from '../../entities/kardex.entity';
import { ProductosService } from './productos.service';
import { ProductosController } from './productos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Producto, Kardex])],
  controllers: [ProductosController],
  providers: [ProductosService],
})
export class ProductosModule {}
