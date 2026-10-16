import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as path from 'path';

export function typeOrmConfig(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'mundo_detalles',
    schema: process.env.DB_SCHEMA || 'inventario',
    entities: [path.join(__dirname, '../entities/*.entity{.ts,.js}')],
    synchronize: false,
    logging: process.env.NODE_ENV !== 'production',
  };
}
