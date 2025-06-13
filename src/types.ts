import type { InferOptionSchema, Session, User } from "better-auth";
import type { bookings, user } from "./schema";

export type BookingService = {
	/**
	 * Service ID
	 */
	id: string;
	/**
	 * Service name
	 */
	name: string;
	/**
	 * Service description
	 */
	description?: string;
	/**
	 * Duration in minutes
	 */
	duration: number;
	/**
	 * Price of the service
	 */
	price: number;
	/**
	 * Currency code (USD, EUR, etc.)
	 */
	currency: string;
	/**
	 * Maximum number of participants
	 */
	maxParticipants?: number;
	/**
	 * Minimum number of participants
	 */
	minParticipants?: number;
	/**
	 * Service category
	 */
	category?: string;
	/**
	 * Service type - determines booking behavior
	 */
	type?: "appointment" | "event" | "rental" | "subscription" | "course" | "table" | "room" | "custom";
	/**
	 * Booking advance requirements
	 */
	bookingWindow?: {
		minAdvanceHours?: number; // Minimum hours in advance
		maxAdvanceDays?: number; // Maximum days in advance
	};
	/**
	 * Cancellation policy
	 */
	cancellationPolicy?: {
		allowCancellation: boolean;
		cutoffHours?: number; // Hours before booking when cancellation is no longer allowed
		refundPolicy?: "full" | "partial" | "none";
		refundPercentage?: number; // If partial refund
	};
	/**
	 * Recurring booking options
	 */
	recurring?: {
		enabled: boolean;
		intervals?: ("daily" | "weekly" | "monthly")[];
		maxOccurrences?: number;
	};
	/**
	 * Available time slots
	 */
	availableSlots?: {
		dayOfWeek: number; // 0-6 (Sunday to Saturday)
		startTime: string; // HH:mm format
		endTime: string; // HH:mm format
	}[];
	/**
	 * Special availability (overrides regular slots)
	 */
	specialAvailability?: {
		date: string; // YYYY-MM-DD
		slots: {
			startTime: string;
			endTime: string;
			available: boolean; // false = blocked
		}[];
	}[];
	/**
	 * Resource requirements (rooms, equipment, etc.)
	 */
	requiredResources?: {
		id: string;
		name: string;
		type: string;
		quantity?: number;
	}[];
	/**
	 * Staff requirements
	 */
	requiredStaff?: {
		role: string;
		count: number;
		specificStaffIds?: string[];
	}[];
	/**
	 * Location information
	 */
	location?: {
		type: "physical" | "virtual" | "hybrid";
		address?: string;
		room?: string;
		virtualLink?: string;
		coordinates?: {
			lat: number;
			lng: number;
		};
	};
	/**
	 * Pricing variations
	 */
	pricingTiers?: {
		name: string;
		condition: string; // e.g., "group_size > 5", "booking_date < today + 7"
		price: number;
		description?: string;
	}[];
	/**
	 * Custom fields required for booking
	 */
	customFields?: {
		id: string;
		name: string;
		type: "text" | "number" | "email" | "phone" | "select" | "multiselect" | "checkbox" | "date";
		required: boolean;
		options?: string[]; // For select/multiselect
		validation?: string; // Regex pattern
	}[];
	/**
	 * Is service active
	 */
	isActive?: boolean;
	/**
	 * Service metadata
	 */
	metadata?: Record<string, any>;
	/**
	 * Created at timestamp
	 */
	createdAt?: Date;
	/**
	 * Updated at timestamp
	 */
	updatedAt?: Date;
};

export interface Booking {
	/**
	 * Database identifier
	 */
	id: string;
	/**
	 * Service ID
	 */
	serviceId: string;
	/**
	 * User ID who made the booking
	 */
	userId: string;
	/**
	 * Parent booking ID (for recurring bookings)
	 */
	parentBookingId?: string;
	/**
	 * Booking start date and time
	 */
	startDate: Date;
	/**
	 * Booking end date and time
	 */
	endDate: Date;
	/**
	 * Booking status
	 */
	status: "pending" | "confirmed" | "cancelled" | "completed" | "no-show" | "rescheduled" | "waitlisted";
	/**
	 * Number of participants
	 */
	participants: number;
	/**
	 * Participant details
	 */
	participantDetails?: {
		name: string;
		email?: string;
		phone?: string;
		age?: number;
		notes?: string;
	}[];
	/**
	 * Total price
	 */
	totalPrice: number;
	/**
	 * Currency code
	 */
	currency: string;
	/**
	 * Applied discounts
	 */
	discounts?: {
		type: "percentage" | "fixed";
		value: number;
		code?: string;
		description?: string;
	}[];
	/**
	 * Customer notes
	 */
	notes?: string;
	/**
	 * Contact email
	 */
	contactEmail?: string;
	/**
	 * Contact phone
	 */
	contactPhone?: string;
	/**
	 * Reference ID for external systems
	 */
	referenceId?: string;
	/**
	 * Payment status
	 */
	paymentStatus?: "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
	/**
	 * Payment method
	 */
	paymentMethod?: string;
	/**
	 * Payment transaction ID
	 */
	paymentTransactionId?: string;
	/**
	 * Stripe Payment Intent ID
	 */
	stripePaymentIntentId?: string;
	/**
	 * Stripe Customer ID
	 */
	stripeCustomerId?: string;
	/**
	 * Stripe Checkout Session ID
	 */
	stripeCheckoutSessionId?: string;
	/**
	 * Assigned resources
	 */
	assignedResources?: {
		resourceId: string;
		resourceName: string;
		quantity: number;
	}[];
	/**
	 * Assigned staff
	 */
	assignedStaff?: {
		staffId: string;
		staffName: string;
		role: string;
	}[];
	/**
	 * Check-in/Check-out times (for rentals, rooms, etc.)
	 */
	checkIn?: Date;
	checkOut?: Date;
	/**
	 * Custom field values
	 */
	customFieldValues?: Record<string, any>;
	/**
	 * Recurring booking configuration
	 */
	recurringConfig?: {
		frequency: "daily" | "weekly" | "monthly";
		interval: number; // Every X days/weeks/months
		endDate?: Date;
		occurrencesCount?: number;
		completedOccurrences: number;
	};
	/**
	 * Waitlist information
	 */
	waitlistInfo?: {
		position: number;
		notifiedAt?: Date;
		expiresAt?: Date;
	};
	/**
	 * Booking source
	 */
	source?: "web" | "mobile" | "api" | "admin" | "phone" | "walk-in";
	/**
	 * Internal notes (staff only)
	 */
	internalNotes?: string;
	/**
	 * Booking metadata (stored as JSON string)
	 */
	metadata?: string;
	/**
	 * Created at timestamp
	 */
	createdAt: Date;
	/**
	 * Updated at timestamp
	 */
	updatedAt: Date;
}

export interface BookingOptions {
	/**
	 * Enable email notifications
	 */
	enableNotifications?: boolean;
	/**
	 * Notification settings
	 */
	notifications?: {
		/**
		 * Send confirmation email
		 */
		sendConfirmation?: boolean;
		/**
		 * Send reminder email
		 */
		sendReminder?: boolean;
		/**
		 * Reminder time in hours before booking
		 */
		reminderHours?: number;
		/**
		 * Email templates
		 */
		templates?: {
			confirmation?: string;
			reminder?: string;
			cancellation?: string;
		};
	};
	/**
	 * Time zone for booking calculations
	 */
	timeZone?: string;
	/**
	 * Default currency for services
	 */
	defaultCurrency?: string;
	/**
	 * Maximum booking advance in days
	 */
	maxBookingAdvanceDays?: number;
	/**
	 * Payment integration
	 */
	payment?: {
		/**
		 * Enable payment processing
		 */
		enabled: boolean;
		/**
		 * Payment provider
		 */
		provider?: "stripe" | "paypal" | "custom";
		/**
		 * Payment configuration
		 */
		config?: Record<string, any>;
		/**
		 * Stripe configuration
		 */
		stripe?: {
			secretKey: string;
			publishableKey: string;
			webhookSecret: string;
			currency?: string;
			automatic_payment_methods?: {
				enabled: boolean;
			};
		};
	};
	/**
	 * Booking rules and restrictions
	 */
	rules?: {
		/**
		 * Minimum booking time in advance (minutes)
		 */
		minAdvanceTime?: number;
		/**
		 * Maximum booking time in advance (days)
		 */
		maxAdvanceDays?: number;
		/**
		 * Allow cancellation
		 */
		allowCancellation?: boolean;
		/**
		 * Cancellation deadline in hours
		 */
		cancellationDeadlineHours?: number;
		/**
		 * Require approval for bookings
		 */
		requireApproval?: boolean;
	};
	/**
	 * Callback functions
	 */
	callbacks?: {
		/**
		 * Called when a booking is created
		 */
		onBookingCreated?: (booking: Booking, user: User) => Promise<void>;
		/**
		 * Called when a booking is confirmed
		 */
		onBookingConfirmed?: (booking: Booking, user: User) => Promise<void>;
		/**
		 * Called when a booking is cancelled
		 */
		onBookingCancelled?: (booking: Booking, user: User) => Promise<void>;
		/**
		 * Called when payment is completed
		 */
		onPaymentCompleted?: (booking: Booking, paymentData: any) => Promise<void>;
	};
	/**
	 * Authorization function
	 */
	authorizeBooking?: (
		data: {
			user: User & Record<string, any>;
			session: Session & Record<string, any>;
			serviceId: string;
			startDate: Date;
			endDate: Date;
		},
		request?: Request,
	) => Promise<boolean>;
	/**
	 * Custom availability check
	 */
	checkAvailability?: (
		serviceId: string,
		startDate: Date,
		endDate: Date,
	) => Promise<boolean>;
	/**
	 * Custom database schema
	 */
	schema?: any;
}

export interface InputBooking extends Omit<Booking, "id" | "createdAt" | "updatedAt"> {}

export interface InputBookingService extends Omit<BookingService, "id" | "createdAt" | "updatedAt"> {}
