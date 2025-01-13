import { Module } from '@nestjs/common';
import { PaymentsModule } from './payments/payments.module';
import { PaymentsWebsocketModule } from './websocket/payments-ws.module';

@Module({
  imports: [PaymentsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
