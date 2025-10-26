import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class WsAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const token = client.handshake.headers.token as string;

    if (!token) {
      Logger.warn('No se proporcionó token en el handshake de WebSocket');
      throw new WsException('No autorizado');
    }

    try {
      const decoded = jwt.verify(token, process.env.SECRET_ADMIN) as any;
      client.user = decoded; // Adjunta la información del usuario al socket
      return true;
    } catch (error) {
      Logger.error(`Error de autenticación WebSocket: ${error.message}`);
      throw new WsException('Token inválido o caducado');
    }
  }
}
