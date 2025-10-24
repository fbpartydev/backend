import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from '../../entities/room.entity';
import { RoomVideo } from '../../entities/room-video.entity';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';
import { FacebookScraperService } from '../../Services/facebook-scraper.service';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Room, RoomVideo]),
    AdminModule, // Para usar FacebookScraperService
  ],
  providers: [RoomService],
  controllers: [RoomController],
  exports: [RoomService],
})
export class RoomModule { }

