import { Module } from '@nestjs/common';
import { NatsModule } from 'src/transports/nats.module';
import { PaymentsGateway } from './payments.gateway';
import { PaymentsWebsocketService } from './payments.service';

@Module({
  controllers: [],
  providers: [PaymentsWebsocketService, PaymentsGateway],
  imports: [NatsModule],
  exports: [PaymentsWebsocketService, PaymentsGateway],
})
export class PaymentsWebsocketModule {}
