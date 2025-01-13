import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';

@Injectable()
export class PaymentsWebsocketService {
  private readonly LOGGER = new Logger('PaymentsWebsocketService');

  private connectedClients: { [orderId: string]: Socket[] } = {};
  private pendingEvents: { [orderId: string]: any[] } = {};

  addClient(orderId: string, client: Socket): void {
    if (!this.connectedClients[orderId]) {
      this.connectedClients[orderId] = [];
    }
    this.connectedClients[orderId].push(client);
    this.LOGGER.log(`Client added to room: ${orderId}`);
  }

  removeClient(orderId: string, clientId: string): void {
    if (this.connectedClients[orderId]) {
      this.connectedClients[orderId] = this.connectedClients[orderId].filter(
        (socket) => socket.id !== clientId,
      );
      if (this.connectedClients[orderId].length === 0) {
        delete this.connectedClients[orderId];
      }
      this.LOGGER.log(`Client removed from room: ${orderId}`);
    }
  }

  emitEvent(orderId: string, eventName: string, payload: any): void {
    const clients = this.connectedClients[orderId];
    if (clients && clients.length > 0) {
      clients.forEach((socket) => {
        socket.emit(eventName, payload);
      });
      this.LOGGER.log(`Event '${eventName}' emitted to orderId: ${orderId}`);
    } else {
      this.pendingEvents[orderId] = this.pendingEvents[orderId] || [];
      this.pendingEvents[orderId].push({ eventName, payload });
      this.LOGGER.log(
        `No clients connected for orderId: ${orderId}, event '${eventName}' pending`,
      );
    }
  }

  emitPendingEvents(orderId: string, client: Socket): void {
    const events = this.pendingEvents[orderId];
    if (events && events.length > 0) {
      events.forEach((event) => {
        client.emit(event.eventName, event.payload);
        this.LOGGER.log(
          `Emitting pending event '${event.eventName}' for orderId: ${orderId}`,
        );
      });
      delete this.pendingEvents[orderId];
    }
  }
}
