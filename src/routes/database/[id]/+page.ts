import { error } from '@sveltejs/kit';
import { getSpecies, getSpeciesDetail } from '#lib/database.svelte.ts';
import type { PageLoad } from './$types';

// Species pages are rendered on demand by the SPA fallback, like journal entries.
export const prerender = false;

// Loading before render puts the hero photo in the DOM when the view transition
// snapshots the page, so the thumbnail morph lands.
export const load: PageLoad = async ({ params }) => {
	const id = Number(params.id);
	const species = Number.isInteger(id) ? await getSpecies(id).catch(() => undefined) : undefined;
	if (!species) error(404, 'Flower not found');
	// Details (description, gallery) may be unavailable offline; the page copes without them.
	const detail = await getSpeciesDetail(id).catch(() => undefined);
	return { species, detail };
};
