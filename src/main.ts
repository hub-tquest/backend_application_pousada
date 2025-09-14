// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AuthExceptionFilter } from './shared/exceptions/auth-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuração CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:8080',
      'http://127.0.0.1:3000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Configuração do Swagger - apenas em desenvolvimento
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Hotéis Pousada Chapada API')
      .setDescription(
        'API completa para o sistema de reservas da Pousada Chapada dos Veadeiros',
      )
      .setVersion('1.0')
      .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      })
      .addTag('auth', 'Operações de autenticação')
      .addTag('booking', 'Operações de reservas')
      .addTag(
        'booking-chatbot',
        'Endpoints otimizados para integração com chatbot',
      )
      .addTag('chatbot', 'Operações do chatbot inteligente')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document, {
      customfavIcon: 'https://nestjs.com/img/favicon.ico',
      customSiteTitle: 'Hotéis Pousada Chapada - Docs',
      customCss: `
        .swagger-ui .topbar { background-color: #2c3e50; }
        .swagger-ui .topbar .download-url-wrapper { display: none; }
        .swagger-ui .info .title { color: #3498db; }
        .swagger-ui .info a { color: #2c3e50; }
      `,
    });
  }

  // Configuração global de validação
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Tratamento global de exceções
  app.useGlobalFilters(new AuthExceptionFilter());

  // Configuração de porta - PORT é obrigatória no Cloud Run
  const port = parseInt(process.env.PORT, 10) || 3000;

  app.listen(port, '0.0.0.0', () => {
    console.log(
      `🚀 Servidor rodando na porta ${port} (acessível pela rede externa)`,
    );
  });

  console.log(`
🚀 Pousada Chapada Backend Server
=================================
📡 Server running on: http://localhost:${port}
${process.env.NODE_ENV !== 'production' ? `📚 API Documentation: http://localhost:${port}/api` : ''}
🔧 Environment: ${process.env.NODE_ENV || 'development'}
🏥 Health endpoint: GET /health
📅 Started at: ${new Date().toISOString()}
  `);
}
bootstrap();
