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

    const roomVideo = this.roomVideoRepo.create({
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
      video.status = 'processing';
      await this.roomVideoRepo.save(video);

      const result = await this.scraper.extractVideoUrlFromFacebook(video.facebookUrl);
      
      if (!result.success || !result.videoUrl) {
        throw new Error(result.error || 'No video URL found');
      }

      video.videoUrl = result.videoUrl;
      if (result.title) {
        video.title = result.title;
      }

      const videoPath = await this.downloadVideo(result.videoUrl, videoId);
      
      let finalPath = videoPath;
      if (result.audioUrl) {
        try {
          const audioPath = await this.downloadAudio(result.audioUrl, videoId);
          finalPath = await this.combineVideoAudio(videoPath, audioPath, videoId);
          if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
          if (fs.existsSync(videoPath) && finalPath !== videoPath) fs.unlinkSync(videoPath);
        } catch (audioError) {
          this.logger.error(`Error processing audio for video ${videoId}:`, audioError);
        }
      }
      
      video.localPath = finalPath;
      video.status = 'completed';
      
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

  async getVideoPublicUrl(videoId: number): Promise<string | null> {
    const video = await this.roomVideoRepo.findOne({ where: { id: videoId } });
    if (!video || !video.localPath) {
      return null;
    }

    const fileName = path.basename(video.localPath);
    const port = process.env.PORT || 3020;
    const host = process.env.HOST || 'localhost';
    return `http://${host}:${port}/videos/${fileName}`;
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

  private async combineVideoAudio(videoPath: string, audioPath: string, videoId: number): Promise<string> {
    const videosDir = path.join(process.cwd(), 'videos');
    const outputFileName = `combined_${videoId}_${Date.now()}.mp4`;
    const outputPath = path.join(videosDir, outputFileName);

      this.logger.log(`Combining video and audio for ${videoId}...`);

    try {
      const ffmpegPath = process.platform === 'win32' 
        ? 'C:\\ffmpeg\\bin\\ffmpeg.exe' 
        : 'ffmpeg';
      
      const isWindows = process.platform === 'win32';
      const escapePath = (path: string) => isWindows ? `"${path}"` : path.replace(/ /g, '\\ ');
      
      const videoPathEscaped = escapePath(videoPath);
      const audioPathEscaped = escapePath(audioPath);
      const outputPathEscaped = escapePath(outputPath);
      
        const ffmpegCommand = `${ffmpegPath} -i ${videoPathEscaped} -i ${audioPathEscaped} -c:v libx264 -preset fast -crf 23 -profile:v baseline -level 3.0 -c:a aac -profile:a aac_low -b:a 128k -ar 44100 -ac 2 -map 0:v:0 -map 1:a:0 -shortest -movflags +faststart ${outputPathEscaped}`;
        
        this.logger.log(`Running FFmpeg: ${ffmpegCommand}`);
        await execAsync(ffmpegCommand);
        
        this.logger.log(`Video and audio combined successfully`);
        return outputPath;
    } catch (error) {
      this.logger.error(`Error combining video and audio:`, error);
      return videoPath;
    }
  }

  private generateRoomCode(): string {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
  }
}

