import { Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { RoomModule } from '../room/room.module'; // IMPORTANTE

@Module({
  imports: [RoomModule],  // <- Aquí se importa RoomModule
  providers: [WebsocketGateway],
})
export class WebsocketModule {}

