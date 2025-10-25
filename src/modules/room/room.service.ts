import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TypeOrmCrudService } from '@dataui/crud-typeorm';
import { Repository } from 'typeorm';
import { Room } from '../../entities/room.entity';
import { RoomVideo } from '../../entities/room-video.entity';
import { CreateRoomDto, UpdateRoomDto, AddVideoDto, AddVideosDto } from './dto/room.dto';
import { FacebookScraperService } from '../../Services/facebook-scraper.service';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class RoomService extends TypeOrmCrudService<Room> {
  private readonly logger = new Logger(RoomService.name);

  constructor(
    @InjectRepository(Room) repo: Repository<Room>,
    @InjectRepository(RoomVideo) private roomVideoRepo: Repository<RoomVideo>,
    private scraper: FacebookScraperService,
  ) {
    super(repo);
  }

  async createRoom(dto: CreateRoomDto): Promise<Room> {
    const code = this.generateRoomCode();
    const room = this.repo.create({
      ...dto,
      code,
      active: true,
    });
    return await this.repo.save(room);
  }

  async updateRoom(id: number, dto: UpdateRoomDto): Promise<Room> {
    const room = await this.repo.findOne({ where: { id } });
    if (!room) {
      throw new Error('Room not found');
    }
    Object.assign(room, dto);
    return await this.repo.save(room);
  }

  async getRoomByCode(code: string): Promise<Room | null> {
    return await this.repo
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.videos', 'videos')
      .where('room.code = :code', { code })
      .andWhere('room.active = true')
      .getOne();
  }

  async addVideoToRoom(roomId: number, dto: AddVideoDto): Promise<RoomVideo> {
    const room = await this.repo.findOne({ where: { id: roomId } });
    if (!room) {
      throw new Error('Room not found');
    }

    const code = this.generateVideoCode();
    const roomVideo = this.roomVideoRepo.create({
      code,
      facebookUrl: dto.facebookUrl,
      status: 'pending',
      roomId: roomId,
    });

    return await this.roomVideoRepo.save(roomVideo);
  }

  async addVideosToRoom(roomId: number, dto: AddVideosDto): Promise<RoomVideo[]> {
    const room = await this.repo.findOne({ where: { id: roomId } });
    if (!room) {
      throw new Error('Room not found');
    }

    const videos = dto.facebookUrls.map(url => 
      this.roomVideoRepo.create({
        code: this.generateVideoCode(),
        facebookUrl: url,
        status: 'pending',
        roomId: roomId,
      })
    );

    return await this.roomVideoRepo.save(videos);
  }

  async getRoomVideos(roomId: number): Promise<RoomVideo[]> {
    return await this.roomVideoRepo
      .createQueryBuilder('video')
      .where('video.roomId = :roomId', { roomId })
      .orderBy('video.createdAt', 'ASC')
      .getMany();
  }

  async processVideo(videoId: number): Promise<RoomVideo> {
    const video = await this.roomVideoRepo.findOne({ where: { id: videoId } });
    if (!video) {
      throw new Error('Video not found');
    }

    try {
      this.logger.log(`Started processing for video ${videoId} with code ${video.code}`);
      video.status = 'processing';
      video.error = null;
      await this.roomVideoRepo.save(video);

      const result = await this.scraper.extractVideoUrlFromFacebook(video.facebookUrl);
      
      if (!result.success || !result.videoUrl) {
        throw new Error(result.error || 'No video URL found');
      }

      video.videoUrl = result.videoUrl;
      video.audioUrl = result.audioUrl;
      if (result.title) {
        video.title = result.title;
      }

      const videoPath = await this.downloadVideo(result.videoUrl, videoId);
      video.localVideoPath = videoPath;
      
      let audioPath: string | null = null;
      if (result.audioUrl) {
        try {
          audioPath = await this.downloadAudio(result.audioUrl, videoId);
          video.localAudioPath = audioPath;
        } catch (audioError) {
          this.logger.error(`Error downloading audio for video ${videoId}:`, audioError);
        }
      }
      
      const thumbnailPath = await this.generateThumbnail(videoPath, videoId);
      if (thumbnailPath) {
        video.thumbnailPath = thumbnailPath;
      }
      
      const port = process.env.PORT || 3020;
      const host = process.env.HOST || 'localhost';
      
      const videoFileName = path.basename(videoPath);
      video.publicVideoUrl = `http://${host}:${port}/videos/${videoFileName}`;
      
      if (audioPath) {
        const audioFileName = path.basename(audioPath);
        video.publicAudioUrl = `http://${host}:${port}/videos/${audioFileName}`;
      }
      
      if (thumbnailPath) {
        const thumbnailFileName = path.basename(thumbnailPath);
        video.thumbnailUrl = `http://${host}:${port}/videos/${thumbnailFileName}`;
      }
      
      video.status = 'completed';
      video.error = null;
      
      await this.roomVideoRepo.save(video);
      return video;

    } catch (error) {
      this.logger.error(`Error processing video ${videoId}:`, error);
      video.status = 'failed';
      video.error = error.message;
      await this.roomVideoRepo.save(video);
      throw error;
    }
  }

  async getVideoPublicUrls(videoId: number): Promise<{ videoUrl: string | null; audioUrl: string | null; thumbnailUrl: string | null }> {
    const video = await this.roomVideoRepo.findOne({ where: { id: videoId } });
    if (!video) {
      return { videoUrl: null, audioUrl: null, thumbnailUrl: null };
    }

    return {
      videoUrl: video.publicVideoUrl || null,
      audioUrl: video.publicAudioUrl || null,
      thumbnailUrl: video.thumbnailUrl || null,
    };
  }

  async markVideoAsWatched(videoId: number): Promise<RoomVideo | null> {
    const video = await this.roomVideoRepo.findOne({ where: { id: videoId } });
    if (!video) {
      return null;
    }

    video.watched = true;
    await this.roomVideoRepo.save(video);
    return video;
  }

  async deleteVideo(videoId: number): Promise<boolean> {
    const video = await this.roomVideoRepo.findOne({ where: { id: videoId } });
    if (!video) {
      return false;
    }

    if (video.localVideoPath && fs.existsSync(video.localVideoPath)) {
      try {
        fs.unlinkSync(video.localVideoPath);
        this.logger.log(`Deleted video file: ${video.localVideoPath}`);
      } catch (error) {
        this.logger.error(`Error deleting video file: ${video.localVideoPath}`, error);
      }
    }

    if (video.localAudioPath && fs.existsSync(video.localAudioPath)) {
      try {
        fs.unlinkSync(video.localAudioPath);
        this.logger.log(`Deleted audio file: ${video.localAudioPath}`);
      } catch (error) {
        this.logger.error(`Error deleting audio file: ${video.localAudioPath}`, error);
      }
    }

    if (video.thumbnailPath && fs.existsSync(video.thumbnailPath)) {
      try {
        fs.unlinkSync(video.thumbnailPath);
        this.logger.log(`Deleted thumbnail file: ${video.thumbnailPath}`);
      } catch (error) {
        this.logger.error(`Error deleting thumbnail file: ${video.thumbnailPath}`, error);
      }
    }

    await this.roomVideoRepo.remove(video);
    return true;
  }

  private async downloadVideo(url: string, videoId: number): Promise<string> {
    const videosDir = path.join(process.cwd(), 'videos');
    
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir, { recursive: true });
    }

    const fileName = `video_${videoId}_${Date.now()}.mp4`;
    const filePath = path.join(videosDir, fileName);

      this.logger.log(`Downloading video ${videoId}...`);

      try {
      const response = await axios.get(url, {
        responseType: 'stream',
        timeout: 300000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.facebook.com/',
          'Origin': 'https://www.facebook.com',
        },
        maxRedirects: 5,
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          this.logger.log(`Video ${videoId} downloaded successfully to ${filePath}`);
          resolve(filePath);
        });
        writer.on('error', (err) => {
          this.logger.error(`Error writing video ${videoId}:`, err);
          reject(err);
        });
      });
    } catch (error) {
      this.logger.error(`Error downloading video ${videoId}:`, error.message);
      throw error;
    }
  }

  private async downloadAudio(url: string, videoId: number): Promise<string> {
    const videosDir = path.join(process.cwd(), 'videos');
    
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir, { recursive: true });
    }

    const fileName = `audio_${videoId}_${Date.now()}.m4a`;
    const filePath = path.join(videosDir, fileName);

      this.logger.log(`Downloading audio ${videoId}...`);

      try {
      const response = await axios.get(url, {
        responseType: 'stream',
        timeout: 300000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'audio/webm,audio/ogg,audio/*;q=0.9,application/ogg;q=0.7,*/*;q=0.5',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.facebook.com/',
          'Origin': 'https://www.facebook.com',
        },
        maxRedirects: 5,
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          this.logger.log(`Audio ${videoId} downloaded successfully`);
          resolve(filePath);
        });
        writer.on('error', (err) => {
          this.logger.error(`Error writing audio ${videoId}:`, err);
          reject(err);
        });
      });
    } catch (error) {
      this.logger.error(`Error downloading audio ${videoId}:`, error.message);
      throw error;
    }
  }


  private async generateThumbnail(videoPath: string, videoId: number): Promise<string | null> {
    const videosDir = path.join(process.cwd(), 'videos');
    const thumbnailFileName = `thumbnail_${videoId}_${Date.now()}.jpg`;
    const thumbnailPath = path.join(videosDir, thumbnailFileName);

    try {
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
      });
      
      const page = await browser.newPage();
      
      const videoUrl = `file://${videoPath}`;
      await page.goto(videoUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      await page.evaluate(() => {
        const video = document.querySelector('video');
        if (video) {
          video.currentTime = 10;
          return new Promise(resolve => {
            video.addEventListener('seeked', resolve, { once: true });
          });
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const screenshot = await page.screenshot({ 
        type: 'jpeg', 
        quality: 80,
        fullPage: false 
      });
      
      await browser.close();
      
      fs.writeFileSync(thumbnailPath, screenshot);
      this.logger.log(`Thumbnail generated successfully: ${thumbnailPath}`);
      return thumbnailPath;
    } catch (error) {
      this.logger.error(`Error generating thumbnail:`, error);
      return null;
    }
  }

  async getVideoByCode(code: string): Promise<RoomVideo | null> {
    return await this.roomVideoRepo
      .createQueryBuilder('video')
      .leftJoinAndSelect('video.room', 'room')
      .where('video.code = :code', { code })
      .getOne();
  }

  private generateRoomCode(): string {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  private generateVideoCode(): string {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
  }
}

