import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { NATS_SERVICE } from 'src/config';
import { PaymentsWebsocketService } from './payments.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class PaymentsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly LOGGER = new Logger('PaymentsWebSocketGateway');

  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
    private readonly websocketService: PaymentsWebsocketService,
  ) {}

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const { orderId } = client.handshake.query;
    const orderIdStr = orderId as string;
    if (!orderIdStr) {
      client.disconnect();
      return;
    }
    this.LOGGER.log(`Casi Client connected to room: ${orderId}`);
    client.join(orderIdStr);
    this.websocketService.addClient(orderIdStr, client);
    this.LOGGER.log(`Client connected to room: ${orderId}`);
    this.websocketService.emitPendingEvents(orderIdStr, client);
  }

  handleDisconnect(client: Socket) {
    const { orderId } = client.handshake.query;
    const orderIdStr = orderId as string;
    if (orderIdStr) {
      this.websocketService.removeClient(orderIdStr, client.id);
    }
    this.LOGGER.log(`Client disconnected: ${client.id}`);
  }

  emitPaymentSession(orderId: string, paymentSessionUrl: string) {
    this.websocketService.emitEvent(orderId, 'payment_session_created', {
      orderId,
      paymentSessionUrl,
    });
  }

  emitPaymentSucceeded(payload) {
    const { orderId } = payload;
    this.websocketService.emitEvent(orderId, 'payment_success', payload);
  }

  @SubscribeMessage('payment_session_abandoned')
  handlePaymentSessionAbandoned(
    client: Socket,
    payload: { orderId: string },
  ): void {
    const { orderId } = payload;

    if (orderId) {
      this.client.emit('payment_session_abandoned', { orderId });
      this.LOGGER.log(`Payment session expired emitted to orderId: ${orderId}`);
    }
  }
}
