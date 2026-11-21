import { error } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { loadShelf } from '#lib/server/shelves';
import type { PageServerLoad } from './$types';

/** One Shelf's page. Addresses follow the Shelf's name, so an old one after a rename is not found. */
export const load: PageServerLoad = ({ params }) => {
	const shelf = loadShelf(db, params.slug.normalize('NFC').toLocaleLowerCase());
	if (!shelf) error(404, 'Shelf not found');
	return { shelf };
};
