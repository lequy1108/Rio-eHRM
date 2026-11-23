import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { UPLOAD_ROOT } from './common/shared/upload';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const prefix = config.get<string>('apiPrefix', 'api');
  const port = config.get<number>('port', 4000);

  app.setGlobalPrefix(prefix);
  app.enableCors({
    origin: config.get<string[]>('corsOrigin'),
    credentials: true,
    // Cho trình duyệt đọc tên file khi tải Excel/PDF
    exposedHeaders: ['Content-Disposition'],
  });
  // File đã upload (ảnh đại diện, tài liệu…) phục vụ tại /uploads/...
  app.useStaticAssets(UPLOAD_ROOT, { prefix: '/uploads' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swagger = new DocumentBuilder()
    .setTitle('eHRM API')
    .setDescription('Hệ thống quản lý nhân sự điện tử')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(`${prefix}/docs`, app, SwaggerModule.createDocument(app, swagger), {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port);
  Logger.log(`API:     http://localhost:${port}/${prefix}`, 'Bootstrap');
  Logger.log(`Swagger: http://localhost:${port}/${prefix}/docs`, 'Bootstrap');
}
bootstrap();
