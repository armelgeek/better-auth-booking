import type { BetterAuthClientPlugin } from "better-auth";
import type { booking } from "./index";

export const bookingClient = () => {
	return {
		id: "booking-client",
		$InferServerPlugin: {} as ReturnType<typeof booking>,
		pathMethods: {
			// Booking endpoints
			"/booking/create": "POST",
			"/booking/list": "GET",
			"/booking/:id": "GET",
			"/booking/:id/cancel": "POST",
			"/booking/cancel": "POST",
			
			// Service endpoints
			"/booking/services": "GET",
			"/booking/services/:id": "GET",
			
			// Admin service endpoints
			"/booking/admin/services": "POST",
			"/booking/admin/services/:id/update": "POST",
			"/booking/admin/services/:id/delete": "POST",
			
			// Payment endpoints
			"/booking/stripe/webhook": "POST",
			"/booking/stripe/checkout": "POST",
			"/booking/payment/status": "GET",
			"/booking/refund": "POST",
		},
	} satisfies BetterAuthClientPlugin;
};
