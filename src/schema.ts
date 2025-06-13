import type { AuthPluginSchema } from "better-auth";
import type { BookingOptions } from "./types";
import { mergeSchema } from "better-auth/db";

export const bookingServices = {
	bookingService: {
		fields: {
			name: {
				type: "string",
				required: true,
			},
			description: {
				type: "string",
				required: false,
			},
			type: {
				type: "string",
				defaultValue: "appointment",
			},
			duration: {
				type: "number",
				required: true,
			},
			price: {
				type: "number",
				required: true,
			},
			currency: {
				type: "string",
				defaultValue: "USD",
			},
			maxParticipants: {
				type: "number",
				required: false,
			},
			minParticipants: {
				type: "number",
				required: false,
			},
			category: {
				type: "string",
				required: false,
			},
			bookingWindow: {
				type: "string", // JSON stringified
				required: false,
			},
			cancellationPolicy: {
				type: "string", // JSON stringified
				required: false,
			},
			recurring: {
				type: "string", // JSON stringified
				required: false,
			},
			availableSlots: {
				type: "string", // JSON stringified
				required: false,
			},
			specialAvailability: {
				type: "string", // JSON stringified
				required: false,
			},
			requiredResources: {
				type: "string", // JSON stringified
				required: false,
			},
			requiredStaff: {
				type: "string", // JSON stringified
				required: false,
			},
			location: {
				type: "string", // JSON stringified
				required: false,
			},
			pricingTiers: {
				type: "string", // JSON stringified
				required: false,
			},
			customFields: {
				type: "string", // JSON stringified
				required: false,
			},
			isActive: {
				type: "boolean",
				defaultValue: true,
			},
			metadata: {
				type: "string", // JSON stringified
				required: false,
			},
		},
	},
} satisfies AuthPluginSchema;

export const bookings = {
	booking: {
		fields: {
			serviceId: {
				type: "string",
				required: true,
			},
			userId: {
				type: "string",
				required: true,
			},
			parentBookingId: {
				type: "string",
				required: false,
			},
			startDate: {
				type: "date",
				required: true,
			},
			endDate: {
				type: "date",
				required: true,
			},
			status: {
				type: "string",
				defaultValue: "pending",
			},
			participants: {
				type: "number",
				defaultValue: 1,
			},
			participantDetails: {
				type: "string", // JSON stringified
				required: false,
			},
			totalPrice: {
				type: "number",
				required: true,
			},
			currency: {
				type: "string",
				defaultValue: "USD",
			},
			discounts: {
				type: "string", // JSON stringified
				required: false,
			},
			notes: {
				type: "string",
				required: false,
			},
			contactEmail: {
				type: "string",
				required: false,
			},
			contactPhone: {
				type: "string",
				required: false,
			},
			referenceId: {
				type: "string",
				required: false,
			},
			paymentStatus: {
				type: "string",
				required: false,
			},
			paymentMethod: {
				type: "string",
				required: false,
			},
			paymentTransactionId: {
				type: "string",
				required: false,
			},
			stripePaymentIntentId: {
				type: "string",
				required: false,
			},
			stripeCustomerId: {
				type: "string",
				required: false,
			},
			stripeCheckoutSessionId: {
				type: "string",
				required: false,
			},
			assignedResources: {
				type: "string", // JSON stringified
				required: false,
			},
			assignedStaff: {
				type: "string", // JSON stringified
				required: false,
			},
			checkIn: {
				type: "date",
				required: false,
			},
			checkOut: {
				type: "date",
				required: false,
			},
			customFieldValues: {
				type: "string", // JSON stringified
				required: false,
			},
			recurringConfig: {
				type: "string", // JSON stringified
				required: false,
			},
			waitlistInfo: {
				type: "string", // JSON stringified
				required: false,
			},
			source: {
				type: "string",
				defaultValue: "web",
			},
			internalNotes: {
				type: "string",
				required: false,
			},
			metadata: {
				type: "string", // JSON stringified
				required: false,
			},
		},
	},
} satisfies AuthPluginSchema;

export const user = {
	user: {
		fields: {
			bookingPreferences: {
				type: "string", // JSON stringified
				required: false,
			},
		},
	},
} satisfies AuthPluginSchema;

export const getSchema = (options: BookingOptions) => {
	return mergeSchema(
		{
			...bookingServices,
			...bookings,
			...user,
		},
		options.schema,
	);
};
