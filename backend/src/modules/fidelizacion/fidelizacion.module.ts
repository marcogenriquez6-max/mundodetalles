import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FidelizacionHistorial } from '../../entities/fidelizacion-historial.entity';
import { Cliente } from '../../entities/cliente.entity';
import { FidelizacionService } from './fidelizacion.service';
import { FidelizacionController } from './fidelizacion.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FidelizacionHistorial, Cliente])],
  controllers: [FidelizacionController],
  providers: [FidelizacionService],
})
export class FidelizacionModule {}
