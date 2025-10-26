import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getAllModules } from './core/load-modules';
import { WebsocketModule } from './modules/websocket/websocket.module';

export const PATH_ROOT = __dirname;
require('dotenv/config');

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      entities: [PATH_ROOT + '/entities/*.entity{.ts,.js}'],
      synchronize: true,
      migrationsRun: false,
      migrations: [PATH_ROOT + '/core/database/migrations/**/*{.ts,.js}'],
      logging: false,
      ssl: {
        rejectUnauthorized: false,
      },
    }),
    ...getAllModules(),
    WebsocketModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
