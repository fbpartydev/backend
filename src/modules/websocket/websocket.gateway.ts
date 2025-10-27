import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect, WsException } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger, Inject } from '@nestjs/common';
import { WsAuthGuard } from 'src/core/guards/ws-auth.guard';
import { JoinRoomDto, PlayerEventDto, ChatMessageDto } from './dto/websocket.dto';
import { RoomService } from 'src/modules/room/room.service';

interface AuthenticatedSocket extends Socket {
  user?: { id: string; email: string; role: string; name: string }; // 'user' es opcional aquí
}

@UseGuards(WsAuthGuard)
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/ws',
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);

  constructor(private readonly roomService: RoomService) {}

  // Usamos AuthenticatedSocket para tipar el cliente
  async handleConnection(client: AuthenticatedSocket, ...args: any[]) {
    // Verificamos si client.user existe antes de intentar acceder a 'email'
    if (client.user) {
      this.logger.log(`Cliente conectado: ${client.id} - Usuario: ${client.user.email}`);
      client.emit('message', 'Bienvenido al servidor WebSocket!');
    } else {
      // Esto solo debería ocurrir si el guard no adjuntó el usuario, lo cual es inesperado
      // si el guard no lanzó una excepción, o si el guard fue comentado.
      this.logger.warn(`Cliente conectado: ${client.id}, pero la información del usuario no está disponible.`);
      client.emit('message', 'Bienvenido al servidor WebSocket! (Sin autenticar)');
      // Opcional: podrías desconectar al cliente si no está autenticado
      // client.disconnect(true);
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.user) {
      this.logger.log(`Cliente desconectado: ${client.id} - Usuario: ${client.user.email}`);
    } else {
      this.logger.log(`Cliente desconectado: ${client.id}, usuario no disponible.`);
    }
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(@MessageBody() data: JoinRoomDto, @ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    if (!client.user) {
        throw new WsException('No autorizado: información de usuario no disponible.');
    }
    this.logger.log(`Cliente ${client.user.email} intentando unirse a la sala ${data.roomId} con video ${data.videoCode}`);
    
    // Buscar la sala por ID, no por código
    const room = await this.roomService.findOne({ where: { id: data.roomId } });

    if (!room) {
      throw new WsException('Sala no encontrada.');
    }

    client.join(`room-${data.roomId}`);
    this.logger.log(`Cliente ${client.user.email} se ha unido a la sala: room-${data.roomId}`);

    // Notificar a todos los demás en la sala que un usuario se ha unido
    this.server.to(`room-${data.roomId}`).emit('user_join', {
      type: 'user_join',
      timestamp: Date.now(),
      userId: client.user.id,
      userName: client.user.name,
      data: { userId: client.user.id, userName: client.user.name },
    });
  }

  @SubscribeMessage('player_event')
  async handlePlayerEvent(@MessageBody() data: PlayerEventDto, @ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    if (!client.user) {
        throw new WsException('No autorizado: información de usuario no disponible para evento de reproductor.');
    }
    this.logger.log(`Evento de reproductor recibido de ${client.user.email} para la sala ${data.roomId}: ${data.event.type}`);

    // Buscar la sala por ID para validar que existe
    const room = await this.roomService.findOne({ where: { id: data.roomId } });
    if (!room) {
      throw new WsException('Sala no encontrada.');
    }

    // Difundir el evento del reproductor a todos en la sala, excluyendo al emisor
    client.to(`room-${data.roomId}`).emit('player_event', {
      roomId: data.roomId,
      event: {
        ...data.event,
        userId: client.user.id,
        userName: client.user.name,
      },
    });
  }

  @SubscribeMessage('chat_message')
  async handleChatMessage(@MessageBody() data: ChatMessageDto, @ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    if (!client.user) {
        throw new WsException('No autorizado: información de usuario no disponible para mensaje de chat.');
    }
    this.logger.log(`Mensaje de chat recibido de ${client.user.email} para la sala ${data.roomId}: ${data.event.data.message}`);
    
    // Buscar la sala por ID para validar que existe
    const room = await this.roomService.findOne({ where: { id: data.roomId } });
    if (!room) {
      throw new WsException('Sala no encontrada.');
    }

    // Difundir el mensaje de chat a todos en la sala, excluyendo al emisor
    client.to(`room-${data.roomId}`).emit('chat_message', {
      roomId: data.roomId,
      event: {
        ...data.event,
        userId: client.user.id,
        userName: client.user.name,
      },
    });
  }
}
  