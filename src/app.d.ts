// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/** Set by the gate hook: true when the app is open or the request
			 * carries a valid session cookie (ADR-0001). */
			authenticated: boolean;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
