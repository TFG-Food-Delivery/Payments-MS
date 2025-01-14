import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { OrderItem } from '../types';
import { OrderItemDto } from './order-item.dto';

export class PaymentSessionDto {
  @IsMongoId()
  orderId: string;

  @IsBoolean()
  useLoyaltyPoints: boolean;

  @IsNumber()
  deliveryFee: number;

  @IsUUID()
  @IsOptional()
  customerId?: string;

  @IsUUID()
  @IsOptional()
  restaurantId?: string;

  @IsString()
  @IsOptional()
  restaurantName?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItem[];
}
