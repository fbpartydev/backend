import { Controller, Post, Get, Body, Param, UseGuards, BadRequestException, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Crud, CrudController } from '@dataui/crud';
import { Room } from '../../entities/room.entity';
import { RoomService } from './room.service';
import { CreateRoomDto, UpdateRoomDto, AddVideoDto, AddVideosDto, ProcessVideoDto } from './dto/room.dto';
import { AdminGuard } from '../../core/guards/auth-admin.guard';

@Crud({
  model: {
    type: Room,
  },
  dto: {
    create: CreateRoomDto,
    update: UpdateRoomDto,
  },
  query: {
    join: {
      videos: {
        eager: true,
      },
    },
  },
  routes: {
    getManyBase: {
      decorators: [ApiBearerAuth(), UseGuards(AdminGuard)],
    },
    getOneBase: {
      decorators: [ApiBearerAuth(), UseGuards(AdminGuard)],
    },
    createOneBase: {
      decorators: [ApiBearerAuth(), UseGuards(AdminGuard)],
    },
    updateOneBase: {
      decorators: [ApiBearerAuth(), UseGuards(AdminGuard)],
    },
    deleteOneBase: {
      decorators: [ApiBearerAuth(), UseGuards(AdminGuard)],
    },
  },
})
@Controller('rooms')
@ApiTags('rooms')
export class RoomController implements CrudController<Room> {
  constructor(public service: RoomService) {}

  @Post('create')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear una nueva sala' })
  @ApiResponse({ status: 201, description: 'Sala creada exitosamente' })
  async createRoom(@Body() dto: CreateRoomDto): Promise<any> {
    return await this.service.createRoom(dto);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Obtener sala por código (público)' })
  @ApiResponse({ status: 200, description: 'Sala encontrada' })
  async getRoomByCode(@Param('code') code: string): Promise<any> {
    const room = await this.service.getRoomByCode(code);
    if (!room) {
      throw new BadRequestException('Room not found');
    }
    return room;
  }

  @Post(':roomId/add-video')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Agregar URL de video a la sala' })
  @ApiResponse({ status: 201, description: 'Video agregado' })
  async addVideo(@Param('roomId') roomId: number, @Body() dto: AddVideoDto): Promise<any> {
    return await this.service.addVideoToRoom(roomId, dto);
  }

  @Post(':roomId/add-videos')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Agregar múltiples URLs de videos a la sala' })
  @ApiResponse({ status: 201, description: 'Videos agregados' })
  async addVideos(@Param('roomId') roomId: number, @Body() dto: AddVideosDto): Promise<any> {
    return await this.service.addVideosToRoom(roomId, dto);
  }

  @Get(':roomId/videos')
  @ApiOperation({ summary: 'Obtener videos de una sala' })
  @ApiResponse({ status: 200, description: 'Lista de videos' })
  async getRoomVideos(@Param('roomId') roomId: number): Promise<any> {
    return await this.service.getRoomVideos(roomId);
  }

  @Post('videos/:videoId/process')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Procesar y descargar un video' })
  @ApiResponse({ status: 200, description: 'Video procesado' })
  async processVideo(@Param('videoId') videoId: number): Promise<any> {
    const video = await this.service.processVideo(videoId);
    const publicUrl = await this.service.getVideoPublicUrl(videoId);
    return {
      ...video,
      publicUrl,
    };
  }

  @Get('videos/:videoId/public-url')
  @ApiOperation({ summary: 'Obtener URL pública del video' })
  @ApiResponse({ status: 200, description: 'URL pública' })
  async getVideoPublicUrl(@Param('videoId') videoId: number): Promise<any> {
    const url = await this.service.getVideoPublicUrl(videoId);
    if (!url) {
      throw new BadRequestException('Video not available');
    }
    return { publicUrl: url };
  }

  @Patch('videos/:videoId/mark-watched')
  @ApiOperation({ summary: 'Marcar video como visto' })
  @ApiResponse({ status: 200, description: 'Video marcado como visto' })
  @ApiResponse({ status: 404, description: 'Video no encontrado' })
  async markVideoAsWatched(@Param('videoId') videoId: number): Promise<any> {
    const video = await this.service.markVideoAsWatched(videoId);
    if (!video) {
      throw new BadRequestException('Video not found');
    }
    return video;
  }
}

