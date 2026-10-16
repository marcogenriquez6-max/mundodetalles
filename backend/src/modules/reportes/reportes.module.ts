import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reporte } from '../../entities/reporte.entity';
import { ReportesService } from './reportes.service';
import { ReportesController } from './reportes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Reporte])],
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}
