import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

/**
 * Canal en tiempo real (Socket.IO sobre WebSocket) para la autorización remota
 * de descuentos. Solo el SERVIDOR emite eventos, después de persistir cada
 * cambio en la base de datos; los clientes únicamente escuchan:
 *  - "autorizacion-pendiente": un vendedor solicitó un precio especial.
 *  - "autorizacion-respondida": el administrador aprobó, modificó o rechazó.
 * Si el administrador no está conectado, la solicitud sigue disponible en
 * GET /api/autorizaciones/pendientes.
 */
@WebSocketGateway({ cors: { origin: '*' } })
export class AutorizacionesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger('AutorizacionesGateway');

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.debug(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Cliente desconectado: ${client.id}`);
  }

  notificarPendiente(payload: Record<string, unknown>) {
    this.server?.emit('autorizacion-pendiente', payload);
  }

  notificarRespondida(payload: Record<string, unknown>) {
    this.server?.emit('autorizacion-respondida', payload);
  }
}
