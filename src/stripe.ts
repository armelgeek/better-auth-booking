import Stripe from "stripe";
import type { BookingOptions, Booking } from "./types";

export interface StripeConfig {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
  currency?: string;
  automatic_payment_methods?: {
    enabled: boolean;
  };
}

export class StripePaymentProvider {
  private stripe: Stripe;
  private config: StripeConfig;

  constructor(config: StripeConfig) {
    this.config = config;
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: "2025-05-28.basil",
    });
  }

  /**
   * Create a Payment Intent for a booking
   */
  async createPaymentIntent(booking: Booking, options?: {
    metadata?: Record<string, string>;
    description?: string;
  }): Promise<Stripe.PaymentIntent> {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: booking.totalPrice, // Already in cents
      currency: booking.currency.toLowerCase(),
      description: options?.description || `Payment for booking ${booking.id}`,
      metadata: {
        bookingId: booking.id,
        serviceId: booking.serviceId,
        userId: booking.userId,
        ...options?.metadata,
      },
      automatic_payment_methods: this.config.automatic_payment_methods || {
        enabled: true,
      },
    });

    return paymentIntent;
  }

  /**
   * Create a Setup Intent for future payments (subscriptions, recurring bookings)
   */
  async createSetupIntent(customerId: string, metadata?: Record<string, string>): Promise<Stripe.SetupIntent> {
    const setupIntent = await this.stripe.setupIntents.create({
      customer: customerId,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return setupIntent;
  }

  /**
   * Create or retrieve a Stripe customer
   */
  async createOrGetCustomer(user: {
    id: string;
    email: string;
    name?: string;
  }): Promise<Stripe.Customer> {
    // Try to find existing customer
    const existingCustomers = await this.stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0];
    }

    // Create new customer
    const customer = await this.stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: {
        userId: user.id,
      },
    });

    return customer;
  }

  /**
   * Process a refund for a booking
   */
  async processRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: "duplicate" | "fraudulent" | "requested_by_customer"
  ): Promise<Stripe.Refund> {
    const refund = await this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount,
      reason: reason || "requested_by_customer",
    });

    return refund;
  }

  /**
   * Cancel a Payment Intent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId);
    return paymentIntent;
  }

  /**
   * Create a subscription for recurring bookings
   */
  async createSubscription(customerId: string, priceId: string, metadata?: Record<string, string>): Promise<Stripe.Subscription> {
    const subscription = await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      metadata,
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
    });

    return subscription;
  }

  /**
   * Create a product and price for a service
   */
  async createServiceProduct(service: {
    id: string;
    name: string;
    description?: string;
    price: number;
    currency: string;
    recurring?: {
      interval: "day" | "week" | "month" | "year";
      interval_count?: number;
    };
  }): Promise<{ product: Stripe.Product; price: Stripe.Price }> {
    // Create product
    const product = await this.stripe.products.create({
      id: `service_${service.id}`,
      name: service.name,
      description: service.description,
      metadata: {
        serviceId: service.id,
      },
    });

    // Create price
    const priceData: Stripe.PriceCreateParams = {
      product: product.id,
      unit_amount: service.price,
      currency: service.currency.toLowerCase(),
      metadata: {
        serviceId: service.id,
      },
    };

    if (service.recurring) {
      priceData.recurring = {
        interval: service.recurring.interval,
        interval_count: service.recurring.interval_count || 1,
      };
    }

    const price = await this.stripe.prices.create(priceData);

    return { product, price };
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.config.webhookSecret
    );
  }

  /**
   * Handle webhook events
   */
  async handleWebhookEvent(
    event: Stripe.Event,
    onPaymentSucceeded?: (paymentIntent: Stripe.PaymentIntent, bookingId: string) => Promise<void>,
    onPaymentFailed?: (paymentIntent: Stripe.PaymentIntent, bookingId: string) => Promise<void>,
    onRefundProcessed?: (refund: Stripe.Refund, bookingId: string) => Promise<void>
  ): Promise<void> {
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const bookingId = paymentIntent.metadata.bookingId;
        if (bookingId && onPaymentSucceeded) {
          await onPaymentSucceeded(paymentIntent, bookingId);
        }
        break;

      case "payment_intent.payment_failed":
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        const failedBookingId = failedPayment.metadata.bookingId;
        if (failedBookingId && onPaymentFailed) {
          await onPaymentFailed(failedPayment, failedBookingId);
        }
        break;

      case "charge.dispute.created":
        // Handle dispute creation
        const dispute = event.data.object as Stripe.Dispute;
        console.log(`Dispute created for charge: ${dispute.charge}`);
        break;

      case "invoice.payment_succeeded":
        // Handle subscription payment success
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`Invoice payment succeeded: ${invoice.id}`);
        break;

      case "invoice.payment_failed":
        // Handle subscription payment failure
        const failedInvoice = event.data.object as Stripe.Invoice;
        console.log(`Invoice payment failed: ${failedInvoice.id}`);
        break;

      case "customer.subscription.deleted":
        // Handle subscription cancellation
        const cancelledSubscription = event.data.object as Stripe.Subscription;
        console.log(`Subscription cancelled: ${cancelledSubscription.id}`);
        break;

      case "refund.created":
        const refund = event.data.object as Stripe.Refund;
        const refundBookingId = refund.metadata?.bookingId;
        if (refundBookingId && onRefundProcessed) {
          await onRefundProcessed(refund, refundBookingId);
        }
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Get payment method details
   */
  async getPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    return this.stripe.paymentMethods.retrieve(paymentMethodId);
  }

  /**
   * Create a checkout session for hosted payment page
   */
  async createCheckoutSession(booking: Booking, options: {
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Checkout.Session> {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: booking.currency.toLowerCase(),
            product_data: {
              name: `Booking ${booking.id}`,
              description: `Service booking for ${booking.serviceId}`,
            },
            unit_amount: booking.totalPrice,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: options.successUrl,
      cancel_url: options.cancelUrl,
      customer_email: options.customerEmail,
      metadata: {
        bookingId: booking.id,
        serviceId: booking.serviceId,
        userId: booking.userId,
        ...options.metadata,
      },
    });

    return session;
  }

  /**
   * Construct webhook event from raw body and signature
   */
  constructWebhookEvent(body: string, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(body, signature, this.config.webhookSecret);
  }

  /**
   * Get payment intent by ID
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.retrieve(paymentIntentId);
  }
}

export default StripePaymentProvider;
