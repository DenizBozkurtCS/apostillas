import { db } from '#lib/server/db';
import { todayISO } from '#lib/server/book';
import { quoteOfTheDay } from '#lib/server/notes';
import type { PageServerLoad } from './$types';

/** The start page: one of the reader's Quotes, the same all day. */
export const load: PageServerLoad = () => {
	return { quote: quoteOfTheDay(db, todayISO()) };
};
