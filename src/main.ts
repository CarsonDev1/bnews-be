// src/main.ts - COMPLETE CORS FIX
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true, bodyLimit: 10485760 }),
  );

  // Register Fastify plugins
  await app.register(require('@fastify/helmet'), {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [`'self'`],
        styleSrc: [`'self'`, `'unsafe-inline'`],
        fontSrc: [`'self'`],
        imgSrc: [`'self'`, 'data:', 'validator.swagger.io', '*.cloudinary.com'],
        scriptSrc: [`'self'`],
      },
    },
  });

  // FIX: Complete CORS configuration for all methods
  await app.register(require('@fastify/cors'), {
    // Allow all origins in development, specify in production
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);

      // Allow all localhost origins
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }

      // In production, add your domain here
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173',
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        // Add your production domain
        // 'https://your-domain.com'
      ];

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow all origins in development
      if (process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'), false);
    },

    // Enable credentials for cookies/auth
    credentials: true,

    // Allow all HTTP methods
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],

    // Allow common headers
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'Pragma',
      'Expires',
      'X-CSRF-Token',
    ],

    // Expose headers to frontend
    exposedHeaders: ['set-cookie', 'X-Total-Count', 'X-Page-Count'],

    // Cache preflight for 24 hours
    maxAge: 86400,

    // Handle preflight requests
    optionsSuccessStatus: 200,
  });

  // Register multipart support for file uploads
  await app.register(require('@fastify/multipart'), {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 1, // Maximum number of files
    },
    addToBody: true, // Add fields to request body
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      // Allow empty strings to be transformed to undefined
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Forum API')
    .setDescription('Forum Backend API Documentation with Authentication')
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
      'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controller!
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Keep auth token after page refresh
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT || 5000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Forum API is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api`);
  console.log(`☁️  Cloudinary integration enabled`);
  console.log(`🌐 CORS enabled for all localhost origins`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap().catch((error) => {
  console.error('❌ Application failed to start:', error);
  process.exit(1);
});

// Alternative simpler CORS config if above is too complex
// Replace the CORS section with this if you prefer:
/*
await app.register(require('@fastify/cors'), {
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['set-cookie'],
  maxAge: 86400,
  optionsSuccessStatus: 200,
});
*/
