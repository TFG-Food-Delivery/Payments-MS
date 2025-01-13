import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { NatsModule } from 'src/transports/nats.module';
import { PaymentsWebsocketModule } from 'src/websocket/payments-ws.module';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService],
  imports: [NatsModule, PaymentsWebsocketModule],
})
export class PaymentsModule {}
