import { pwa } from './pwa.svelte.ts';

/**
 * Hands a photo to the phone so it can be kept outside Wildflower. Web apps can't write
 * to the photo library directly, so this needs a user tap and works per platform:
 * - iOS: opens the share sheet, where "Save Image" puts it in Photos.
 * - Android/desktop: downloads it (Android shows it in the gallery's "Download" album).
 *
 * Must be called synchronously from a click/tap handler: `navigator.share` requires
 * user activation, so nothing may be awaited before it.
 */
export function saveToGallery(file: File, label: string): Promise<void> {
	const named = new File([file], fileName(file, label), { type: file.type || 'image/jpeg' });

	if (pwa.platform === 'ios' && navigator.canShare?.({ files: [named] })) {
		return navigator.share({ files: [named] }).catch((error: unknown) => {
			// Closing the share sheet without saving isn't an error.
			if (error instanceof DOMException && error.name === 'AbortError') return;
			throw error;
		});
	}

	const url = URL.createObjectURL(named);
	const link = document.createElement('a');
	link.href = url;
	link.download = named.name;
	link.click();
	setTimeout(() => URL.revokeObjectURL(url), 60_000);
	return Promise.resolve();
}

/** e.g. `wildflower-backyard-rose-2026-10-07-1544.jpg` */
export function fileName(file: Pick<File, 'type'>, label: string, now = new Date()): string {
	const slug = label
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 40);
	const pad = (n: number) => String(n).padStart(2, '0');
	const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
	const ext = file.type === 'image/png' ? 'png' : file.type === 'image/heic' ? 'heic' : 'jpg';
	return ['wildflower', slug, stamp].filter(Boolean).join('-') + '.' + ext;
}
