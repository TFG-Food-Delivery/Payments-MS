import { IsEnum, IsMongoId } from 'class-validator';
import { OrderStatus, OrderStatusList } from '../enum/order-status.enum';

export class UpdateOrderStatusDto {
  @IsMongoId()
  orderId: string;

  @IsEnum(OrderStatusList, {
    message: `Order status must be a valid value from the list: ${OrderStatusList}.`,
  })
  status: OrderStatus;
}
