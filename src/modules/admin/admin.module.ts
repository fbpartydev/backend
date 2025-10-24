import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminEntity } from '../../entities/admin.entity';
import { FacebookCookie } from '../../entities/facebook-cookie.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { FacebookScraperService } from '../../Services/facebook-scraper.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdminEntity, FacebookCookie])],
  providers: [AdminService, FacebookScraperService],
  controllers: [AdminController],
  exports: [AdminService, FacebookScraperService],
})
export class AdminModule { }
