import { type GenericEndpointContext, logger } from "better-auth";
import type { User } from "better-auth";
import type { BookingOptions, Booking } from "./types";

export async function onBookingCreated(
	ctx: GenericEndpointContext,
	options: BookingOptions,
	booking: Booking,
) {
	try {
		if (options.callbacks?.onBookingCreated) {
			const user = await ctx.context.adapter.findOne<User>({
				model: "user",
				where: [{ field: "id", value: booking.userId }],
			});
			
			if (user) {
				await options.callbacks.onBookingCreated(booking, user);
			}
		}

		// Send confirmation notification if enabled
		if (options.notifications?.sendConfirmation) {
			await sendBookingConfirmation(ctx, options, booking);
		}
	} catch (error: any) {
		logger.error(`Booking creation hook failed. Error: ${error.message}`);
	}
}

export async function onBookingConfirmed(
	ctx: GenericEndpointContext,
	options: BookingOptions,
	booking: Booking,
) {
	try {
		if (options.callbacks?.onBookingConfirmed) {
			const user = await ctx.context.adapter.findOne<User>({
				model: "user",
				where: [{ field: "id", value: booking.userId }],
			});
			
			if (user) {
				await options.callbacks.onBookingConfirmed(booking, user);
			}
		}
	} catch (error: any) {
		logger.error(`Booking confirmation hook failed. Error: ${error.message}`);
	}
}

export async function onBookingCancelled(
	ctx: GenericEndpointContext,
	options: BookingOptions,
	booking: Booking,
) {
	try {
		if (options.callbacks?.onBookingCancelled) {
			const user = await ctx.context.adapter.findOne<User>({
				model: "user",
				where: [{ field: "id", value: booking.userId }],
			});
			
			if (user) {
				await options.callbacks.onBookingCancelled(booking, user);
			}
		}

		// Send cancellation notification if enabled
		if (options.notifications?.sendConfirmation) {
			await sendBookingCancellation(ctx, options, booking);
		}
	} catch (error: any) {
		logger.error(`Booking cancellation hook failed. Error: ${error.message}`);
	}
}

export async function onPaymentCompleted(
	ctx: GenericEndpointContext,
	options: BookingOptions,
	booking: Booking,
	paymentData: any,
) {
	try {
		if (options.callbacks?.onPaymentCompleted) {
			await options.callbacks.onPaymentCompleted(booking, paymentData);
		}

		// Update booking payment status
		await ctx.context.adapter.update({
			model: "booking",
			update: {
				paymentStatus: "paid",
				updatedAt: new Date(),
			},
			where: [{ field: "id", value: booking.id }],
		});
	} catch (error: any) {
		logger.error(`Payment completion hook failed. Error: ${error.message}`);
	}
}

async function sendBookingConfirmation(
	ctx: GenericEndpointContext,
	options: BookingOptions,
	booking: Booking,
) {
	// This is a placeholder for email notification
	// In a real implementation, you would integrate with an email service
	logger.info(`Sending booking confirmation for booking ${booking.id}`);
	
	// You could integrate with services like:
	// - SendGrid
	// - Mailgun
	// - AWS SES
	// - Resend
	// etc.
}

async function sendBookingCancellation(
	ctx: GenericEndpointContext,
	options: BookingOptions,
	booking: Booking,
) {
	// This is a placeholder for email notification
	logger.info(`Sending booking cancellation for booking ${booking.id}`);
}

export async function sendBookingReminder(
	ctx: GenericEndpointContext,
	options: BookingOptions,
	booking: Booking,
) {
	try {
		if (options.notifications?.sendReminder) {
			logger.info(`Sending booking reminder for booking ${booking.id}`);
			// Implementation for sending reminder
		}
	} catch (error: any) {
		logger.error(`Booking reminder failed. Error: ${error.message}`);
	}
}
