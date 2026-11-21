import { isGated } from '#lib/server/auth';
import type { LayoutServerLoad } from './$types';

/** Tell the shell whether the single-password gate is on, so it can offer a
 * "Log out" action (there is nothing to log out of when the app is open). */
export const load: LayoutServerLoad = () => {
	return { gated: isGated() };
};
