import { IsString, IsNumber, IsOptional, IsObject, IsIn } from 'class-validator';

export class PlayerEvent {
  @IsIn(['play', 'pause', 'seek', 'user_join', 'user_leave', 'episode_change', 'message'])
  type: 'play' | 'pause' | 'seek' | 'user_join' | 'user_leave' | 'episode_change' | 'message';

  @IsNumber()
  timestamp: number;

  @IsString()
  userId: string;

  @IsString()
  userName: string;

  @IsOptional()
  @IsObject()
  data?: any;
}

export class JoinRoomDto {
  @IsNumber()
  roomId: number;

  @IsString()
  videoCode: string;
}

export class PlayerEventDto {
  @IsNumber()
  roomId: number;

  @IsObject()
  event: PlayerEvent;
}

export class ChatMessageDto {
  @IsNumber()
  roomId: number;

  @IsObject()
  event: PlayerEvent;
}
