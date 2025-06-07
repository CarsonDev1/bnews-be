// src/main.ts - MINIMAL VERSION WITHOUT HELMET
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true, bodyLimit: 10485760 }),
  );

  // REMOVED: Helmet for development to avoid CSP issues
  // await app.register(require('@fastify/helmet'), { ... });

  // Simple CORS - Allow everything for development
  await app.register(require('@fastify/cors'), {
    origin: true, // Allow all origins
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['*'],
    exposedHeaders: ['*'],
  });

  // Register multipart support for file uploads
  await app.register(require('@fastify/multipart'), {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 20,
      parts: 30, // Total parts (files + fields)
      headerPairs: 2000, // Headers limit
    },
    addToBody: true,
  });

  // Static file serving - Simple configuration
  const uploadsPath = path.join(__dirname, '..', 'uploads');
  console.log('📁 Serving static files from:', uploadsPath);

  await app.register(require('@fastify/static'), {
    root: uploadsPath,
    prefix: '/uploads/',
    decorateReply: false,
    setHeaders: (res, pathName) => {
      // Simple headers for development
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'public, max-age=31536000');

      // Set content type for images
      const ext = path.extname(pathName).toLowerCase();
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
      };

      if (mimeTypes[ext]) {
        res.setHeader('Content-Type', mimeTypes[ext]);
      }
    },
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Forum API')
    .setDescription('Forum Backend API Documentation')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('categories', 'Category management endpoints')
    .addTag('posts', 'Post management endpoints')
    .addTag('tags', 'Tag management endpoints')
    .addTag('upload', 'File upload endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT || 5000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Forum API is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api`);
  console.log(`🖼️  Images served at: http://localhost:${port}/uploads/`);
  console.log(`🔗 Test: http://localhost:${port}/uploads/posts/f141b559-03af-4c5b-94e1-6dac0665933a.webp`);
  console.log(`⚠️  Security headers disabled for development`);
}

bootstrap().catch((error) => {
  console.error('❌ Application failed to start:', error);
  process.exit(1);
});