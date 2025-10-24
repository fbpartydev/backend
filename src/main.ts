import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder, SwaggerDocumentOptions } from '@nestjs/swagger';
import { getAllModules } from './core/load-modules';
import { json, urlencoded } from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

const port = process.env.PORT || 3020;
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  
  app.use(require('express').json({ limit: '50mb' }));
  app.use(require('express').urlencoded({ limit: '50mb', extended: true }));

  app.use('/videos', require('express').static(join(__dirname, '..', 'videos'), {
    setHeaders: (res, path) => {
      if (path.endsWith('.mp4')) {
        res.setHeader('Content-Type', 'video/mp4');
      }
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range');
    }
  }));

  app.enableCors();

  app.useGlobalPipes(new ValidationPipe());

  if (process.env.NODE_ENV === 'development') {
    const config = new DocumentBuilder()
      .setTitle('API FB Party')
      .setDescription(
        'APIS de FB Party',
      )
      .setVersion('1.0')
      .addBearerAuth({
        type: 'apiKey',
        name: 'token',
        scheme: 'http',
        in: 'header',
      })
      .build();

    const modules = getAllModules();
    const document = SwaggerModule.createDocument(app, config, {
      include: modules,
    });

    SwaggerModule.setup('api', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
      customSiteTitle: 'API FB Party',
    });
  }

  await app.listen(port);
  Logger.log(`Server running on port: ${port}`, 'bootstrap');
}
bootstrap();
