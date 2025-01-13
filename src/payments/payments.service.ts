import { Inject, Injectable, Logger } from '@nestjs/common';
import { envs, NATS_SERVICE } from 'src/config';
import Stripe from 'stripe';
import { PaymentSessionDto } from './dto';
import { Request, Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';
import { PaymentsGateway } from 'src/websocket/payments.gateway';

/**
 * Service for handling payments using Stripe.
 */
@Injectable()
export class PaymentsService {
  private readonly LOGGER = new Logger('PaymentsService');
  private readonly stripe = new Stripe(envs.stripeSecret);

  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
    private readonly paymentsGateway: PaymentsGateway,
  ) {}

  /**
   * Creates a payment session with Stripe for the given order.
   *
   * @param paymentSessionDto - The payment session data.
   * @returns The created Stripe session.
   */
  async createPaymentSession(paymentSessionDto: PaymentSessionDto) {
    const { items, orderId } = paymentSessionDto;
    try {
      const lineItems = items.map((item) => {
        return {
          price_data: {
            currency: 'eur',
            product_data: {
              name: item.name,
            },
            unit_amount: Math.round(item.price * 100),
          },
          quantity: item.quantity,
        };
      });

      const session = await this.stripe.checkout.sessions.create({
        payment_intent_data: {
          metadata: {
            orderId: orderId,
          },
        },
        line_items: lineItems,
        mode: 'payment',
        success_url: `${envs.stripeSuccessUrl}?orderId=${orderId}`,
        cancel_url: `${envs.stripeCancelUrl}?orderId=${orderId}`,
        expires_at: Math.floor(Date.now() / 1000) + 1800,
      });

      this.paymentsGateway.emitPaymentSession(orderId, session.url);

      return session;
    } catch (error) {
      console.error(
        `Error creating payment session for order ${orderId}:`,
        error,
      );

      // Emit an error to the client's room
      this.paymentsGateway.server.to(orderId).emit('payment_session_error', {
        orderId,
        error: 'Failed to create payment session. Please try again.',
      });
    }
  }

  /**
   * Handles Stripe webhook events.
   *
   * @param req - The incoming request.
   * @param res - The response.
   */
  async stripeWebhook(req: Request, res: Response) {
    this.LOGGER.debug(req);
    this.LOGGER.debug(req.headers);
    const sig = req.headers['stripe-signature'];

    let event: Stripe.Event;
    const endpointSecret = envs.stripeEndpointSecret;

    this.LOGGER.debug('Stripe webhook received');
    try {
      event = this.stripe.webhooks.constructEvent(
        req['rawBody'],
        sig,
        endpointSecret,
      );
    } catch (err) {
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    this.LOGGER.debug('Stripe webhook received2. Switching on event type');
    switch (event.type) {
      case 'charge.succeeded': {
        const chargeSucceded = event.data.object;
        const payload = {
          stripePaymentId: chargeSucceded.id,
          orderId: chargeSucceded.metadata.orderId,
          receiptUrl: chargeSucceded.receipt_url,
        };
        this.LOGGER.log(`Charge succeeded orderID: id=${payload.orderId}`);
        this.paymentsGateway.emitPaymentSucceeded(payload);
        this.LOGGER.log(`Charge succeeded: id=${chargeSucceded.metadata}`);
        this.client.emit('payment_succeeded', payload);
        break;
      }
      case 'checkout.session.expired': {
        const sessionExpired = event.data.object;
        const orderId = sessionExpired.metadata.orderId;
        this.LOGGER.log(`Payment session expired for orderId: ${orderId}`);
        this.client.emit('payment_session_expired', { orderId });
        break;
      }
      default: {
        this.LOGGER.log(`Unhandled event type ${event.type}`);
      }
    }
    return res.status(200).json({ sig });
  }
}
