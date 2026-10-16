import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Kardex } from '../../entities/kardex.entity';
import { Producto } from '../../entities/producto.entity';
import { KardexService } from './kardex.service';
import { KardexController } from './kardex.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Kardex, Producto])],
  controllers: [KardexController],
  providers: [KardexService],
})
export class KardexModule {}
