import type { BookingOptions, BookingService } from "./types";

// Database service functions
export async function getServiceById(
	adapter: any,
	serviceId: string
): Promise<BookingService | null> {
	try {
		const service = await adapter.db.query.bookingService.findFirst({
			where: { id: serviceId, isActive: true },
		});

		if (!service) return null;

		// Parse JSON fields
		return {
			...service,
			bookingWindow: service.bookingWindow ? JSON.parse(service.bookingWindow) : undefined,
			cancellationPolicy: service.cancellationPolicy ? JSON.parse(service.cancellationPolicy) : undefined,
			recurring: service.recurring ? JSON.parse(service.recurring) : undefined,
			availableSlots: service.availableSlots ? JSON.parse(service.availableSlots) : undefined,
			specialAvailability: service.specialAvailability ? JSON.parse(service.specialAvailability) : undefined,
			requiredResources: service.requiredResources ? JSON.parse(service.requiredResources) : undefined,
			requiredStaff: service.requiredStaff ? JSON.parse(service.requiredStaff) : undefined,
			location: service.location ? JSON.parse(service.location) : undefined,
			pricingTiers: service.pricingTiers ? JSON.parse(service.pricingTiers) : undefined,
			customFields: service.customFields ? JSON.parse(service.customFields) : undefined,
			metadata: service.metadata ? JSON.parse(service.metadata) : undefined,
		};
	} catch (error) {
		console.error("Error fetching service:", error);
		return null;
	}
}

export async function getServices(
	adapter: any,
	filters?: {
		category?: string;
		type?: string;
		active?: boolean;
	}
): Promise<BookingService[]> {
	try {
		const whereCondition: any = {};
		
		if (filters?.active !== undefined) {
			whereCondition.isActive = filters.active;
		} else {
			whereCondition.isActive = true; // Default to active only
		}

		if (filters?.category) {
			whereCondition.category = filters.category;
		}

		const services = await adapter.db.query.bookingService.findMany({
			where: whereCondition,
		});

		// Parse JSON fields and apply additional filters
		let parsedServices = services.map((service: any) => ({
			...service,
			bookingWindow: service.bookingWindow ? JSON.parse(service.bookingWindow) : undefined,
			cancellationPolicy: service.cancellationPolicy ? JSON.parse(service.cancellationPolicy) : undefined,
			recurring: service.recurring ? JSON.parse(service.recurring) : undefined,
			availableSlots: service.availableSlots ? JSON.parse(service.availableSlots) : undefined,
			specialAvailability: service.specialAvailability ? JSON.parse(service.specialAvailability) : undefined,
			requiredResources: service.requiredResources ? JSON.parse(service.requiredResources) : undefined,
			requiredStaff: service.requiredStaff ? JSON.parse(service.requiredStaff) : undefined,
			location: service.location ? JSON.parse(service.location) : undefined,
			pricingTiers: service.pricingTiers ? JSON.parse(service.pricingTiers) : undefined,
			customFields: service.customFields ? JSON.parse(service.customFields) : undefined,
			metadata: service.metadata ? JSON.parse(service.metadata) : undefined,
		}));

		// Filter by type if specified
		if (filters?.type) {
			parsedServices = parsedServices.filter((service: any) => service.type === filters.type);
		}

		return parsedServices;
	} catch (error) {
		console.error("Error fetching services:", error);
		return [];
	}
}

// Legacy functions for backward compatibility
export async function getServicesLegacy(options: BookingOptions): Promise<BookingService[]> {
	console.warn("getServicesLegacy is deprecated - services are now stored in database");
	return [];
}

export async function getServiceByIdLegacy(
	options: BookingOptions,
	serviceId: string,
): Promise<BookingService | undefined> {
	console.warn("getServiceByIdLegacy is deprecated - services are now stored in database");
	return undefined;
}

export function isTimeSlotAvailable(
	service: BookingService,
	startDate: Date,
): boolean {
	if (!service.availableSlots || service.availableSlots.length === 0) {
		return true; // No restrictions
	}

	const dayOfWeek = startDate.getDay();
	const timeString = startDate.toTimeString().slice(0, 5); // HH:mm format

	return service.availableSlots.some((slot) => {
		if (slot.dayOfWeek !== dayOfWeek) return false;
		return timeString >= slot.startTime && timeString <= slot.endTime;
	});
}

export function calculateBookingPrice(
	service: BookingService,
	participants: number = 1,
	duration?: number,
): number {
	const baseDuration = duration || service.duration;
	const basePrice = service.price;
	
	// Simple calculation: base price * participants * (duration / service.duration)
	return basePrice * participants * (baseDuration / service.duration);
}

export function validateBookingTime(
	startDate: Date,
	endDate: Date,
	service: BookingService,
	rules?: BookingOptions["rules"],
): { isValid: boolean; error?: string } {
	const now = new Date();
	
	// Check if booking is in the past
	if (startDate <= now) {
		return { isValid: false, error: "Booking cannot be in the past" };
	}
	
	// Check minimum advance time
	if (rules?.minAdvanceTime) {
		const minTime = new Date(now.getTime() + rules.minAdvanceTime * 60 * 1000);
		if (startDate < minTime) {
			return { 
				isValid: false, 
				error: `Booking must be at least ${rules.minAdvanceTime} minutes in advance` 
			};
		}
	}
	
	// Check maximum advance time
	if (rules?.maxAdvanceDays) {
		const maxTime = new Date(now.getTime() + rules.maxAdvanceDays * 24 * 60 * 60 * 1000);
		if (startDate > maxTime) {
			return { 
				isValid: false, 
				error: `Booking cannot be more than ${rules.maxAdvanceDays} days in advance` 
			};
		}
	}
	
	// Check if end date is after start date
	if (endDate <= startDate) {
		return { isValid: false, error: "End date must be after start date" };
	}
	
	// Check if booking duration matches service duration (with some tolerance)
	const bookingDuration = (endDate.getTime() - startDate.getTime()) / (1000 * 60); // minutes
	if (Math.abs(bookingDuration - service.duration) > 5) { // 5 minutes tolerance
		return { 
			isValid: false, 
			error: `Booking duration must be ${service.duration} minutes` 
		};
	}
	
	// Check time slot availability
	if (!isTimeSlotAvailable(service, startDate)) {
		return { 
			isValid: false, 
			error: "Selected time slot is not available for this service" 
		};
	}
	
	return { isValid: true };
}
