import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { EventPattern } from '@nestjs/microservices';
import { PaymentSessionDto } from './dto';
import Stripe from 'stripe';
import { Request, Response } from 'express';

/**
 * PaymentsController handles incoming requests related to payments.
 * It listens to events and HTTP requests to manage payment sessions and webhooks.
 */
@Controller('payments')
export class PaymentsController {
  /**
   * Constructs a new PaymentsController.
   * @param paymentsService - The service used to handle payment-related operations.
   */
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Handles the 'order_created' event to create a new payment session.
   * @param paymentSessionDto - Data transfer object containing payment session details.
   * @returns The result of the payment session creation.
   */
  @EventPattern('order_created')
  createPaymentSession(@Body() paymentSessionDto: PaymentSessionDto) {
    return this.paymentsService.createPaymentSession(paymentSessionDto);
  }

  /**
   * Handles Stripe webhook events.
   * @param req - The incoming request object.
   * @param res - The outgoing response object.
   * @returns The result of the webhook processing.
   */
  @Post('webhook')
  async stripeWebhook(@Req() req: Request, @Res() res: Response) {
    return this.paymentsService.stripeWebhook(req, res);
  }
}
