import { db, type Flower, type Photo } from './db.ts';
import { forgetPhotoUrl } from './photos.ts';

export interface FlowerDetails {
	name: string;
	species?: string;
	/** The flower-database species this entry is linked to, if any. */
	speciesId?: number;
}

export interface FlowerWithCover extends Flower {
	cover?: Photo;
	photoCount: number;
}

export async function createFlower(details: FlowerDetails): Promise<number> {
	const now = Date.now();
	return db.flowers.add({
		...clean(details),
		notes: '',
		createdAt: now,
		updatedAt: now
	});
}

export async function updateFlower(
	id: number,
	changes: Partial<Omit<Flower, 'id' | 'createdAt'>>
): Promise<void> {
	await db.flowers.update(id, { ...changes, updatedAt: Date.now() });
}

export async function editFlowerDetails(id: number, details: FlowerDetails): Promise<void> {
	await updateFlower(id, clean(details));
}

/** Newest first, each with its first photo as a cover. */
export async function listFlowers(): Promise<FlowerWithCover[]> {
	const flowers = await db.flowers.orderBy('createdAt').reverse().toArray();
	return Promise.all(
		flowers.map(async (flower) => {
			// Separate collections: Dexie's `.first()` applies limit(1) to the collection it's called on.
			const photos = () => db.photos.where('flowerId').equals(flower.id);
			const [cover, photoCount] = await Promise.all([photos().first(), photos().count()]);
			return { ...flower, cover, photoCount };
		})
	);
}

export interface DeletedFlower {
	flower: Flower;
	photos: Photo[];
}

/** Deletes a flower and its photos, returning them so the deletion can be undone. */
export async function deleteFlower(id: number): Promise<DeletedFlower | undefined> {
	return db.transaction('rw', db.flowers, db.photos, async () => {
		const flower = await db.flowers.get(id);
		if (!flower) return undefined;
		const photos = await db.photos.where('flowerId').equals(id).toArray();
		await db.photos.bulkDelete(photos.map((p) => p.id));
		await db.flowers.delete(id);
		photos.forEach((p) => forgetPhotoUrl(p.id));
		return { flower, photos };
	});
}

export async function restoreFlower({ flower, photos }: DeletedFlower): Promise<void> {
	await db.transaction('rw', db.flowers, db.photos, async () => {
		await db.flowers.put(flower);
		await db.photos.bulkPut(photos);
	});
}

function clean({ name, species, speciesId }: FlowerDetails) {
	return {
		name: name.trim(),
		species: species?.trim() || undefined,
		speciesId,
		linked: speciesId !== undefined
	};
}

/**
 * Links an entry to a database species, taking its botanical name as the entry's species,
 * or unlinks it with `undefined` (keeping the species name).
 */
export async function linkFlower(
	id: number,
	species: { id: number; botanical: string } | undefined
): Promise<void> {
	await updateFlower(
		id,
		species
			? { speciesId: species.id, linked: true, species: species.botanical }
			: { speciesId: undefined, linked: false }
	);
}

/** Journal entries linked to a database species. */
export function flowersOfSpecies(speciesId: number): Promise<Flower[]> {
	return db.flowers.filter((flower) => flower.speciesId === speciesId).toArray();
}
