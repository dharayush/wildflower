import { db, type Photo } from './db.ts';

const MAX_EDGE = 2048;
const QUALITY = 0.85;

/** Scale `width`×`height` down (never up) so the longest edge is at most `max`. */
export function fitWithin(width: number, height: number, max: number) {
	const scale = Math.min(1, max / Math.max(width, height));
	return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** Downscale and re-encode camera photos so IndexedDB doesn't fill up with 10 MB originals. */
async function compress(file: File): Promise<Blob> {
	try {
		const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
		const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_EDGE);
		const canvas = new OffscreenCanvas(width, height);
		const ctx = canvas.getContext('2d')!;
		// JPEG has no alpha; without a fill, transparent pixels turn black.
		ctx.fillStyle = '#fff';
		ctx.fillRect(0, 0, width, height);
		ctx.drawImage(bitmap, 0, 0, width, height);
		bitmap.close();
		return await canvas.convertToBlob({ type: 'image/jpeg', quality: QUALITY });
	} catch {
		// Unsupported format or API (e.g. HEIC on some browsers): store the original.
		return file;
	}
}

export async function addPhotos(flowerId: number, files: Iterable<File>): Promise<void> {
	const blobs = await Promise.all([...files].map(compress));
	const now = Date.now();
	await db.photos.bulkAdd(blobs.map((blob, i) => ({ flowerId, blob, createdAt: now + i })));
	await db.flowers.update(flowerId, { updatedAt: now });
}

export async function deletePhoto(id: number): Promise<void> {
	await db.photos.delete(id);
	forgetPhotoUrl(id);
}

export function listPhotos(flowerId: number): Promise<Photo[]> {
	return db.photos.where('flowerId').equals(flowerId).sortBy('createdAt');
}

// Object URLs are cached per photo so list thumbnails and detail images share
// one already-decoded URL, which lets page transitions morph between them.
const urls = new Map<number, string>();

export function photoUrl(photo: Photo): string {
	let url = urls.get(photo.id);
	if (!url) {
		url = URL.createObjectURL(photo.blob);
		urls.set(photo.id, url);
	}
	return url;
}

export function forgetPhotoUrl(id: number): void {
	const url = urls.get(id);
	if (url) URL.revokeObjectURL(url);
	urls.delete(id);
}
