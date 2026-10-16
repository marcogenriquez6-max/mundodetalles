// Zona horaria del negocio (Oruro, Bolivia): los reportes por día usan la fecha local.
process.env.TZ = process.env.TZ || 'America/La_Paz';

import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger, ClassSerializerInterceptor } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';
import { QueryFailedFilter } from './common/filters/query-failed.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api');
  app.enableCors();

  // Imágenes subidas desde el frontend (p. ej. foto de producto).
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/api/uploads/' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Errores de base de datos -> respuestas 400/409 claras (nunca un 500 por datos inválidos).
  app.useGlobalFilters(new QueryFailedFilter());
  // Oculta campos marcados con @Exclude (hash de contraseña y refresh token).
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const config = new DocumentBuilder()
    .setTitle('Mundo Detalles - Sistema de Gestión')
    .setDescription(
      'API del sistema web de gestión de inventarios, control de ventas y fidelización de clientes para la empresa comercial Mundo Detalles.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.APP_PORT || 3002;
  await app.listen(port);
  logger.log(`App running on http://localhost:${port}/api`);
  logger.log(`Swagger docs on http://localhost:${port}/api/docs`);
}

bootstrap();
