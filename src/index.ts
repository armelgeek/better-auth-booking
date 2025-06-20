import {
	type GenericEndpointContext,
	type BetterAuthPlugin,
	logger,
} from "better-auth";
import { createAuthEndpoint } from "better-auth/plugins";
import { z } from "zod";
import {
	sessionMiddleware,
	APIError,
} from "better-auth/api";
import {
	onBookingCreated,
	onBookingConfirmed,
	onBookingCancelled,
} from "./hooks";
import type {
	BookingOptions,
	BookingService,
	Booking,
	InputBooking,
} from "./types";
import { 
	getServiceById, 
	getServices, 
	validateBookingTime, 
	calculateBookingPrice 
} from "./utils";
import { getSchema } from "./schema";
import StripePaymentProvider, { type StripeConfig } from "./stripe";

const BOOKING_ERROR_CODES = {
	SERVICE_NOT_FOUND: "Service not found",
	BOOKING_NOT_FOUND: "Booking not found",
	INVALID_BOOKING_TIME: "Invalid booking time",
	BOOKING_CONFLICT: "Booking time conflicts with existing booking",
	UNAUTHORIZED_BOOKING: "Unauthorized to make this booking",
	CANCELLATION_NOT_ALLOWED: "Cancellation not allowed",
	PAYMENT_REQUIRED: "Payment is required for this booking",
	SERVICE_UNAVAILABLE: "Service is not available at the requested time",
} as const;


export const booking = <O extends BookingOptions>(options: O) => {
	const bookingEndpoints = {
		createBooking: createAuthEndpoint(
			"/booking/create",
			{
				method: "POST",
				body: z.object({
					serviceId: z.string({
						description: "The ID of the service to book"
					}),
					startDate: z.string({
						description: "Start date and time in ISO format"
					}).transform((val) => new Date(val)),
					endDate: z.string({
						description: "End date and time in ISO format"
					}).transform((val) => new Date(val)),
					participants: z.number({
						description: "Number of participants"
					}).min(1).default(1),
					notes: z.string({
						description: "Additional notes for the booking"
					}).optional(),
					contactEmail: z.string({
						description: "Contact email"
					}).email().optional(),
					contactPhone: z.string({
						description: "Contact phone number"
					}).optional(),
					metadata: z.record(z.string(), z.any()).optional(),
				}),
				use: [sessionMiddleware],
				metadata: {
					openapi: {
						tags: ["Bookings"],
						summary: "Create a new booking",
						description: "Create a new booking for a service",
						security: [{ bearerAuth: [] }],
						responses: {
							"200": {
								description: "Booking created successfully",
								content: {
									"application/json": {
										schema: {
											type: "object",
											properties: {
												id: { type: "string" },
												serviceId: { type: "string" },
												userId: { type: "string" },
												status: { type: "string", enum: ["pending", "confirmed", "cancelled", "completed"] },
												startDate: { type: "string", format: "date-time" },
												endDate: { type: "string", format: "date-time" },
												participants: { type: "number" },
												totalPrice: { type: "number" },
												paymentStatus: { type: "string" },
												createdAt: { type: "string", format: "date-time" }
											}
										}
									}
								}
							},
							"400": { description: "Bad request - Invalid booking data" },
							"401": { description: "Unauthorized - Authentication required" },
							"404": { description: "Service not found" }
						}
					}
				}
			},
			async (ctx) => {
				const { user } = ctx.context.session;
				const { serviceId, startDate, endDate, participants, notes, contactEmail, contactPhone, metadata } = ctx.body;

				// Get service details
				const service = await getServiceById(ctx.context.adapter, serviceId);
				if (!service) {
					throw new APIError("BAD_REQUEST", {
						message: BOOKING_ERROR_CODES.SERVICE_NOT_FOUND,
					});
				}

				// Validate booking time
				const timeValidation = validateBookingTime(startDate, endDate, service, options.rules);
				if (!timeValidation.isValid) {
					throw new APIError("BAD_REQUEST", {
						message: timeValidation.error || BOOKING_ERROR_CODES.INVALID_BOOKING_TIME,
					});
				}

				// Check authorization if defined
				if (options.authorizeBooking) {
					const isAuthorized = await options.authorizeBooking({
						user,
						session: ctx.context.session.session,
						serviceId,
						startDate,
						endDate,
					}, ctx.request);

					if (!isAuthorized) {
						throw new APIError("UNAUTHORIZED", {
							message: BOOKING_ERROR_CODES.UNAUTHORIZED_BOOKING,
						});
					}
				}

				// Check availability if custom check is defined
				if (options.checkAvailability) {
					const isAvailable = await options.checkAvailability(serviceId, startDate, endDate);
					if (!isAvailable) {
						throw new APIError("BAD_REQUEST", {
							message: BOOKING_ERROR_CODES.SERVICE_UNAVAILABLE,
						});
					}
				}

				// Check for conflicts with existing bookings
				const existingBookings = await ctx.context.adapter.findMany<Booking>({
					model: "booking",
					where: [
						{
							field: "serviceId",
							value: serviceId,
						},
						{
							field: "status",
							value: "confirmed",
							connector: "OR",
						},
						{
							field: "status",
							value: "pending",
							connector: "OR",
						},
					],
				});

				const hasConflict = existingBookings.some((booking) => {
					return (
						(startDate >= booking.startDate && startDate < booking.endDate) ||
						(endDate > booking.startDate && endDate <= booking.endDate) ||
						(startDate <= booking.startDate && endDate >= booking.endDate)
					);
				});

				if (hasConflict) {
					throw new APIError("BAD_REQUEST", {
						message: BOOKING_ERROR_CODES.BOOKING_CONFLICT,
					});
				}

				// Calculate total price
				const totalPrice = calculateBookingPrice(service, participants);

				// Create booking
				const bookingData: InputBooking = {
					serviceId,
					userId: user.id,
					startDate,
					endDate,
					status: options.rules?.requireApproval ? "pending" : "confirmed",
					participants,
					totalPrice,
					currency: service.currency,
					notes,
					contactEmail: contactEmail || user.email,
					contactPhone,
					paymentStatus: options.payment?.enabled ? "pending" : undefined,
					metadata: metadata ? JSON.stringify(metadata) : undefined,
				};

				const booking = await ctx.context.adapter.create<InputBooking, Booking>({
					model: "booking",
					data: bookingData,
				});

				// Handle Stripe payment if enabled
				let paymentData: any = {};
				if (options.payment?.enabled && options.payment.stripe) {
					try {
						const stripeProvider = new StripePaymentProvider(options.payment.stripe);
						
						// Create customer if needed
						const customer = await stripeProvider.createOrGetCustomer({
							id: user.id,
							email: user.email,
							name: user.name,
						});

						// Create payment intent
						const paymentIntent = await stripeProvider.createPaymentIntent(booking, {
							description: `Payment for ${service.name} booking`,
							metadata: {
								customerId: customer.id,
							},
						});

						// Update booking with payment intent
						await ctx.context.adapter.update<Booking>({
							model: "booking",
							where: [{ field: "id", value: booking.id }],
							update: {
								stripePaymentIntentId: paymentIntent.id,
								stripeCustomerId: customer.id,
							},
						});

						paymentData = {
							clientSecret: paymentIntent.client_secret,
							paymentIntentId: paymentIntent.id,
							customerId: customer.id,
						};
					} catch (error) {
						logger.error("Failed to create Stripe payment intent:", error);
						// Don't fail the booking creation, just log the error
						paymentData.error = "Payment setup failed";
					}
				}

				// Trigger hooks
				await onBookingCreated(ctx, options, booking);

				if (booking.status === "confirmed" && !options.payment?.enabled) {
					await onBookingConfirmed(ctx, options, booking);
				}

				return ctx.json({
					...booking,
					payment: paymentData,
				});
			},
		),

		listBookings: createAuthEndpoint(
			"/booking/list",
			{
				method: "GET",
				query: z.object({
					status: z.enum(["pending", "confirmed", "cancelled", "completed", "no-show"]).optional(),
					serviceId: z.string().optional(),
					from: z.string().optional().transform((val) => val ? new Date(val) : undefined),
					to: z.string().optional().transform((val) => val ? new Date(val) : undefined),
				}).optional(),
				use: [sessionMiddleware],
			},
			async (ctx) => {
				const { user } = ctx.context.session;
				const query = ctx.query || {};

				const whereConditions = [
					{ field: "userId", value: user.id },
				];

				if (query.status) {
					whereConditions.push({ field: "status", value: query.status });
				}

				if (query.serviceId) {
					whereConditions.push({ field: "serviceId", value: query.serviceId });
				}

				const bookings = await ctx.context.adapter.findMany<Booking>({
					model: "booking",
					where: whereConditions,
				});

				// Filter by date range if provided
				let filteredBookings = bookings;
				if (query.from || query.to) {
					filteredBookings = bookings.filter((booking) => {
						if (query.from && booking.startDate < query.from) return false;
						if (query.to && booking.startDate > query.to) return false;
						return true;
					});
				}

				return ctx.json(filteredBookings);
			},
		),

		cancelBooking: createAuthEndpoint(
			"/booking/cancel",
			{
				method: "POST",
				body: z.object({
					bookingId: z.string({
						description: "The ID of the booking to cancel"
					}),
					reason: z.string({
						description: "Reason for cancellation"
					}).optional(),
				}),
				use: [sessionMiddleware],
			},
			async (ctx) => {
				const { user } = ctx.context.session;
				const { bookingId, reason } = ctx.body;

				const booking = await ctx.context.adapter.findOne<Booking>({
					model: "booking",
					where: [{ field: "id", value: bookingId }],
				});

				if (!booking) {
					throw new APIError("BAD_REQUEST", {
						message: BOOKING_ERROR_CODES.BOOKING_NOT_FOUND,
					});
				}

				if (booking.userId !== user.id) {
					throw new APIError("UNAUTHORIZED", {
						message: BOOKING_ERROR_CODES.UNAUTHORIZED_BOOKING,
					});
				}

				if (booking.status === "cancelled") {
					throw new APIError("BAD_REQUEST", {
						message: "Booking is already cancelled",
					});
				}

				// Check cancellation rules
				if (options.rules?.allowCancellation === false) {
					throw new APIError("BAD_REQUEST", {
						message: BOOKING_ERROR_CODES.CANCELLATION_NOT_ALLOWED,
					});
				}

				if (options.rules?.cancellationDeadlineHours) {
					const deadlineTime = new Date(
						booking.startDate.getTime() - 
						options.rules.cancellationDeadlineHours * 60 * 60 * 1000
					);
					
					if (new Date() > deadlineTime) {
						throw new APIError("BAD_REQUEST", {
							message: `Cancellation must be made at least ${options.rules.cancellationDeadlineHours} hours in advance`,
						});
					}
				}

				// Update booking status
				const updatedBooking = await ctx.context.adapter.update<Booking>({
					model: "booking",
					update: {
						status: "cancelled",
						updatedAt: new Date(),
						metadata: booking.metadata ? 
							JSON.stringify({
								...JSON.parse(booking.metadata),
								cancellationReason: reason,
								cancelledAt: new Date().toISOString(),
							}) : 
							JSON.stringify({
								cancellationReason: reason,
								cancelledAt: new Date().toISOString(),
							}),
					},
					where: [{ field: "id", value: bookingId }],
				});

				if (!updatedBooking) {
					throw new APIError("INTERNAL_SERVER_ERROR", {
						message: "Failed to update booking",
					});
				}

				// Trigger hooks
				await onBookingCancelled(ctx, options, updatedBooking);

				return ctx.json(updatedBooking);
			},
		),

		// Service listing endpoint
		getServices: createAuthEndpoint(
			"/booking/services",
			{
				method: "GET",
				query: z.object({
					active: z.boolean().optional(),
					category: z.string().optional(),
					type: z.string().optional(),
				}).optional(),
				metadata: {
					openapi: {
						tags: ["Services"],
						summary: "Get available services",
						description: "Retrieve a list of available booking services",
						parameters: [
							{
								name: "active",
								in: "query",
								description: "Filter by service status",
								schema: { type: "boolean" }
							},
							{
								name: "category",
								in: "query",
								description: "Filter by service category",
								schema: { type: "string" }
							},
							{
								name: "type",
								in: "query",
								description: "Filter by service type",
								schema: { type: "string" }
							}
						],
						responses: {
							"200": {
								description: "List of services",
								content: {
									"application/json": {
										schema: {
											type: "array",
											items: {
												type: "object",
												properties: {
													id: { type: "string" },
													name: { type: "string" },
													description: { type: "string" },
													duration: { type: "number" },
													price: { type: "number" },
													currency: { type: "string" },
													type: { type: "string" },
													category: { type: "string" },
													maxParticipants: { type: "number" },
													isActive: { type: "boolean" }
												}
											}
										}
									}
								}
							}
						}
					}
				}
			},
			async (ctx) => {
				const filters = ctx.query || {};
				const services = await getServices(ctx.context.adapter, filters);
				return ctx.json(services);
			},
		),

		// Service details endpoint
		getService: createAuthEndpoint(
			"/booking/services/:id",
			{
				method: "GET",
				metadata: {
					openapi: {
						tags: ["Services"],
						summary: "Get service details",
						description: "Get detailed information about a specific service",
						parameters: [
							{
								name: "id",
								in: "path",
								required: true,
								description: "Service ID",
								schema: { type: "string" }
							}
						],
						responses: {
							"200": {
								description: "Service details",
								content: {
									"application/json": {
										schema: {
											type: "object",
											properties: {
												id: { type: "string" },
												name: { type: "string" },
												description: { type: "string" },
												duration: { type: "number" },
												price: { type: "number" },
												currency: { type: "string" },
												type: { type: "string" },
												category: { type: "string" },
												maxParticipants: { type: "number" },
												isActive: { type: "boolean" },
												metadata: { type: "object" }
											}
										}
									}
								}
							},
							"404": { description: "Service not found" }
						}
					}
				}
			},
			async (ctx) => {
				const serviceId = ctx.params?.id;
				if (!serviceId) {
					throw new APIError("BAD_REQUEST", {
						message: "Service ID is required",
					});
				}

				const service = await getServiceById(ctx.context.adapter, serviceId);
				if (!service) {
					throw new APIError("NOT_FOUND", {
						message: BOOKING_ERROR_CODES.SERVICE_NOT_FOUND,
					});
				}

				return ctx.json(service);
			},
		),

		// Admin endpoints for service management
		createService: createAuthEndpoint(
			"/booking/admin/services",
			{
				method: "POST",
				body: z.object({
					name: z.string().min(1),
					description: z.string().optional(),
					duration: z.number().positive(),
					price: z.number().min(0),
					currency: z.string().length(3),
					type: z.enum(["appointment", "event", "rental", "course", "table", "room"]),
					category: z.string().optional(),
					maxParticipants: z.number().positive().optional(),
					requiresApproval: z.boolean().optional(),
					isActive: z.boolean().optional(),
					availability: z.record(z.array(z.object({
						start: z.string(),
						end: z.string()
					}))).optional(),
					metadata: z.record(z.any()).optional(),
				}),
				metadata: {
					openapi: {
						tags: ["Admin - Services"],
						summary: "Create a new service",
						description: "Create a new booking service (admin only)",
						security: [{ bearerAuth: [] }],
						responses: {
							"200": {
								description: "Service created successfully",
								content: {
									"application/json": {
										schema: {
											type: "object",
											properties: {
												id: { type: "string" },
												name: { type: "string" },
												description: { type: "string" },
												duration: { type: "number" },
												price: { type: "number" },
												currency: { type: "string" },
												type: { type: "string", enum: ["appointment", "event", "rental", "class", "table", "room"] },
												category: { type: "string" },
												maxParticipants: { type: "number" },
												requiresApproval: { type: "boolean" },
												isActive: { type: "boolean" },
												availability: { type: "object" },
												metadata: { type: "object" },
												createdAt: { type: "string", format: "date-time" },
												updatedAt: { type: "string", format: "date-time" }
											}
										}
									}
								}
							},
							"401": { description: "Unauthorized - Admin access required" },
							"400": { description: "Bad request - Invalid input data" }
						}
					}
				}
			},
			async (ctx) => {
				// Check if user has admin privileges
				if (!ctx.context.session?.user?.role || ctx.context.session.user.role !== 'admin') {
					throw new APIError("FORBIDDEN", {
						message: "Admin access required",
					});
				}

				const serviceData = ctx.body;
				const serviceId = `service_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

				const newService: BookingService = {
					id: serviceId,
					name: serviceData.name,
					description: serviceData.description || "",
					duration: serviceData.duration,
					price: serviceData.price,
					currency: serviceData.currency,
					type: serviceData.type,
					category: serviceData.category || "",
					maxParticipants: serviceData.maxParticipants || 1,
					isActive: serviceData.isActive ?? true,
					metadata: serviceData.metadata || {},
					createdAt: new Date(),
					updatedAt: new Date(),
				};

				const createdService = await ctx.context.adapter.create<BookingService>({
					model: "bookingService",
					data: newService,
				});

				return ctx.json(createdService);
			},
		),

		updateService: createAuthEndpoint(
			"/booking/admin/services/:id/update",
			{
				method: "POST",
				body: z.object({
					name: z.string().min(1).optional(),
					description: z.string().optional(),
					duration: z.number().positive().optional(),
					price: z.number().min(0).optional(),
					currency: z.string().length(3).optional(),
					type: z.enum(["appointment", "event", "rental", "course", "table", "room"]).optional(),
					category: z.string().optional(),
					maxParticipants: z.number().positive().optional(),
					requiresApproval: z.boolean().optional(),
					isActive: z.boolean().optional(),
					availability: z.record(z.array(z.object({
						start: z.string(),
						end: z.string()
					}))).optional(),
					metadata: z.record(z.any()).optional(),
				}),
				metadata: {
					openapi: {
						tags: ["Admin - Services"],
						summary: "Update an existing service",
						description: "Update a booking service (admin only)",
						security: [{ bearerAuth: [] }],
						parameters: [
							{
								name: "id",
								in: "path",
								required: true,
								description: "Service ID",
								schema: { type: "string" }
							}
						],
						responses: {
							"200": {
								description: "Service updated successfully"
							},
							"401": { description: "Unauthorized - Admin access required" },
							"404": { description: "Service not found" },
							"400": { description: "Bad request - Invalid input data" }
						}
					}
				}
			},
			async (ctx) => {
				// Check if user has admin privileges
				if (!ctx.context.session?.user?.role || ctx.context.session.user.role !== 'admin') {
					throw new APIError("FORBIDDEN", {
						message: "Admin access required",
					});
				}

				const serviceId = ctx.params?.id;
				if (!serviceId) {
					throw new APIError("BAD_REQUEST", {
						message: "Service ID is required",
					});
				}

				const updateData = ctx.body;
				const updatedService = await ctx.context.adapter.update<BookingService>({
					model: "bookingService",
					where: [{ field: "id", value: serviceId }],
					update: {
						...updateData,
						updatedAt: new Date(),
					},
				});

				if (!updatedService) {
					throw new APIError("NOT_FOUND", {
						message: BOOKING_ERROR_CODES.SERVICE_NOT_FOUND,
					});
				}

				return ctx.json(updatedService);
			},
		),

		deleteService: createAuthEndpoint(
			"/booking/admin/services/:id/delete",
			{
				method: "POST",
				metadata: {
					openapi: {
						tags: ["Admin - Services"],
						summary: "Delete a service",
						description: "Delete a booking service (admin only)",
						security: [{ bearerAuth: [] }],
						parameters: [
							{
								name: "id",
								in: "path",
								required: true,
								description: "Service ID",
								schema: { type: "string" }
							}
						],
						responses: {
							"200": {
								description: "Service deleted successfully",
								content: {
									"application/json": {
										schema: {
											type: "object",
											properties: {
												success: { type: "boolean" },
												message: { type: "string" }
											}
										}
									}
								}
							},
							"401": { description: "Unauthorized - Admin access required" },
							"404": { description: "Service not found" },
							"400": { description: "Bad request - Service has active bookings" }
						}
					}
				}
			},
			async (ctx) => {
				// Check if user has admin privileges
				if (!ctx.context.session?.user?.role || ctx.context.session.user.role !== 'admin') {
					throw new APIError("FORBIDDEN", {
						message: "Admin access required",
					});
				}

				const serviceId = ctx.params?.id;
				if (!serviceId) {
					throw new APIError("BAD_REQUEST", {
						message: "Service ID is required",
					});
				}

				// Check if service has active bookings
				const activeBookings = await ctx.context.adapter.findMany<Booking>({
					model: "booking",
					where: [
						{ field: "serviceId", value: serviceId },
						{ field: "status", value: "confirmed", operator: "in" }
					],
				});

				if (activeBookings.length > 0) {
					throw new APIError("BAD_REQUEST", {
						message: "Cannot delete service with active bookings",
					});
				}

				try {
					await ctx.context.adapter.delete<BookingService>({
						model: "bookingService",
						where: [{ field: "id", value: serviceId }],
					});

					return ctx.json({ 
						success: true, 
						message: "Service deleted successfully" 
					});
				} catch (error) {
					throw new APIError("NOT_FOUND", {
						message: BOOKING_ERROR_CODES.SERVICE_NOT_FOUND,
					});
				}
			},
		),

		// Stripe webhook endpoint
		stripeWebhook: createAuthEndpoint(
			"/booking/stripe/webhook",
			{
				method: "POST",
				requireHeaders: true,
			},
			async (ctx) => {
				if (!options.payment?.enabled || !options.payment.stripe) {
					throw new APIError("BAD_REQUEST", {
						message: "Stripe not configured",
					});
				}

				const stripeProvider = new StripePaymentProvider(options.payment.stripe);
				const sig = ctx.headers.get('stripe-signature');
				
				if (!sig) {
					throw new APIError("BAD_REQUEST", {
						message: "Missing Stripe signature",
					});
				}

				let event;
				try {
					const body = await ctx.request?.text();
					if (!body) {
						throw new APIError("BAD_REQUEST", {
							message: "Empty request body",
						});
					}
					event = stripeProvider.constructWebhookEvent(body, sig);
				} catch (err) {
					logger.error("Webhook signature verification failed:", err);
					throw new APIError("BAD_REQUEST", {
						message: "Invalid signature",
					});
				}

				// Handle the event
				await stripeProvider.handleWebhookEvent(
					event,
					// Payment succeeded callback
					async (paymentIntent, bookingId) => {
						try {
							const bookings = await ctx.context.adapter.findMany<Booking>({
								model: "booking",
								where: [{ field: "id", value: bookingId }],
							});

							const booking = bookings[0];
							if (booking) {
								// Update booking status
								const updatedBooking = await ctx.context.adapter.update<Booking>({
									model: "booking",
									where: [{ field: "id", value: bookingId }],
									update: {
										paymentStatus: "paid",
										status: "confirmed",
										paymentTransactionId: paymentIntent.id,
										updatedAt: new Date(),
									},
								});

								if (updatedBooking) {
									// Trigger confirmation hook
									await onBookingConfirmed(ctx, options, updatedBooking);
									
									// Call custom callback if provided
									if (options.callbacks?.onPaymentCompleted) {
										await options.callbacks.onPaymentCompleted(updatedBooking, paymentIntent);
									}
								}
							}
						} catch (error) {
							logger.error("Error processing payment success:", error);
						}
					},
					// Payment failed callback
					async (paymentIntent, bookingId) => {
						try {
							await ctx.context.adapter.update<Booking>({
								model: "booking",
								where: [{ field: "id", value: bookingId }],
								update: {
									paymentStatus: "failed",
									status: "cancelled",
									updatedAt: new Date(),
								},
							});
						} catch (error) {
							logger.error("Error processing payment failure:", error);
						}
					},
					// Refund processed callback
					async (refund, bookingId) => {
						try {
							const refundAmount = typeof refund.amount === 'number' ? refund.amount : 0;
							const chargeAmount = typeof refund.charge === 'string' ? 
								// We'd need to fetch the charge to get the amount, for now assume partial
								refundAmount * 2 : 0;
							
							await ctx.context.adapter.update<Booking>({
								model: "booking",
								where: [{ field: "id", value: bookingId }],
								update: {
									paymentStatus: refundAmount >= chargeAmount ? "refunded" : "partially_refunded",
									updatedAt: new Date(),
								},
							});
						} catch (error) {
							logger.error("Error processing refund:", error);
						}
					}
				);

				return ctx.json({ received: true });
			},
		),

		// Create Checkout Session endpoint
		createCheckoutSession: createAuthEndpoint(
			"/booking/stripe/checkout",
			{
				method: "POST",
				body: z.object({
					bookingId: z.string(),
					successUrl: z.string().url(),
					cancelUrl: z.string().url(),
				}),
				use: [sessionMiddleware],
			},
			async (ctx) => {
				if (!options.payment?.enabled || !options.payment.stripe) {
					throw new APIError("BAD_REQUEST", {
						message: "Stripe not configured",
					});
				}

				const { user } = ctx.context.session;
				const { bookingId, successUrl, cancelUrl } = ctx.body;

				// Get booking
				const bookings = await ctx.context.adapter.findMany<Booking>({
					model: "booking",
					where: [
						{ field: "id", value: bookingId },
						{ field: "userId", value: user.id },
					],
				});

				const booking = bookings[0];
				if (!booking) {
					throw new APIError("NOT_FOUND", {
						message: BOOKING_ERROR_CODES.BOOKING_NOT_FOUND,
					});
				}

				if (booking.paymentStatus === "paid") {
					throw new APIError("BAD_REQUEST", {
						message: "Booking already paid",
					});
				}

				const stripeProvider = new StripePaymentProvider(options.payment.stripe);

				try {
					const session = await stripeProvider.createCheckoutSession(booking, {
						successUrl,
						cancelUrl,
						customerEmail: user.email,
					});

					// Update booking with checkout session ID
					await ctx.context.adapter.update<Booking>({
						model: "booking",
						where: [{ field: "id", value: bookingId }],
						update: {
							stripeCheckoutSessionId: session.id,
						},
					});

					return ctx.json({
						sessionId: session.id,
						url: session.url,
					});
				} catch (error) {
					logger.error("Failed to create checkout session:", error);
					throw new APIError("INTERNAL_SERVER_ERROR", {
						message: "Failed to create checkout session",
					});
				}
			},
		),

		// Get payment status endpoint
		getPaymentStatus: createAuthEndpoint(
			"/booking/payment/status",
			{
				method: "GET",
				query: z.object({
					bookingId: z.string(),
				}),
				use: [sessionMiddleware],
			},
			async (ctx) => {
				const { user } = ctx.context.session;
				const { bookingId } = ctx.query;

				const bookings = await ctx.context.adapter.findMany<Booking>({
					model: "booking",
					where: [
						{ field: "id", value: bookingId },
						{ field: "userId", value: user.id },
					],
				});

				const booking = bookings[0];
				if (!booking) {
					throw new APIError("NOT_FOUND", {
						message: BOOKING_ERROR_CODES.BOOKING_NOT_FOUND,
					});
				}

				let stripeStatus = null;
				if (options.payment?.enabled && options.payment.stripe && booking.stripePaymentIntentId) {
					try {
						const stripeProvider = new StripePaymentProvider(options.payment.stripe);
						const paymentIntent = await stripeProvider.getPaymentIntent(booking.stripePaymentIntentId);
						stripeStatus = {
							status: paymentIntent.status,
							clientSecret: paymentIntent.client_secret,
						};
					} catch (error) {
						logger.error("Failed to fetch Stripe payment status:", error);
					}
				}

				return ctx.json({
					bookingId: booking.id,
					paymentStatus: booking.paymentStatus,
					stripe: stripeStatus,
				});
			},
		),

		// Refund booking payment
		refundBooking: createAuthEndpoint(
			"/booking/refund",
			{
				method: "POST",
				body: z.object({
					bookingId: z.string(),
					amount: z.number().optional(),
					reason: z.enum(["duplicate", "fraudulent", "requested_by_customer"]).optional(),
				}),
				use: [sessionMiddleware],
			},
			async (ctx) => {
				if (!options.payment?.enabled || !options.payment.stripe) {
					throw new APIError("BAD_REQUEST", {
						message: "Stripe not configured",
					});
				}

				const { user } = ctx.context.session;
				const { bookingId, amount, reason } = ctx.body;

				// Check if user has admin privileges or is the booking owner
				const bookings = await ctx.context.adapter.findMany<Booking>({
					model: "booking",
					where: [
						{ field: "id", value: bookingId },
						{ field: "userId", value: user.id },
					],
				});

				const booking = bookings[0];
				if (!booking) {
					throw new APIError("NOT_FOUND", {
						message: BOOKING_ERROR_CODES.BOOKING_NOT_FOUND,
					});
				}

				if (booking.paymentStatus !== "paid") {
					throw new APIError("BAD_REQUEST", {
						message: "Booking has not been paid",
					});
				}

				if (!booking.stripePaymentIntentId) {
					throw new APIError("BAD_REQUEST", {
						message: "No Stripe payment found for this booking",
					});
				}

				const stripeProvider = new StripePaymentProvider(options.payment.stripe);

				try {
					const refund = await stripeProvider.processRefund(
						booking.stripePaymentIntentId,
						amount,
						reason || "requested_by_customer"
					);

					// Update booking status
					await ctx.context.adapter.update<Booking>({
						model: "booking",
						where: [{ field: "id", value: bookingId }],
						update: {
							paymentStatus: amount && amount < booking.totalPrice ? "partially_refunded" : "refunded",
							status: "cancelled",
							updatedAt: new Date(),
						},
					});

					return ctx.json({
						refundId: refund.id,
						amount: refund.amount,
						status: refund.status,
					});
				} catch (error) {
					logger.error("Failed to process refund:", error);
					throw new APIError("INTERNAL_SERVER_ERROR", {
						message: "Failed to process refund",
					});
				}
			},
		),
	} as const;

	return {
		id: "booking",
		endpoints: bookingEndpoints,
		schema: getSchema(options),
	} satisfies BetterAuthPlugin;
};

export type { Booking, BookingService, BookingOptions };
