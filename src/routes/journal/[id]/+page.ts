import { error } from '@sveltejs/kit';
import { db } from '#lib/db.ts';
import { listPhotos } from '#lib/photos.ts';
import type { PageLoad } from './$types';

// Entries only exist on-device, so this route is served by the SPA fallback.
export const prerender = false;

// Loading before render (rather than in the component) means the hero photo is in
// the DOM when the view transition snapshots the new page, so the morph lands.
export const load: PageLoad = async ({ params }) => {
	const id = Number(params.id);
	const flower = Number.isInteger(id) ? await db.flowers.get(id) : undefined;
	if (!flower) error(404, 'Flower not found');
	return { flower, photos: await listPhotos(id) };
};
