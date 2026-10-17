/**
 * Pl@ntNet identification API (https://my.plantnet.org/doc). Called straight from the
 * browser with the user's own key, which must be "exposed" with this app's origin listed
 * as an authorized domain in the key's settings, or the browser blocks the request (CORS).
 */

const API = 'https://my-api.plantnet.org/v2';

export const ORGANS = ['auto', 'flower', 'leaf', 'fruit', 'bark'] as const;
export type Organ = (typeof ORGANS)[number];

export const ORGAN_LABELS: Record<Organ, string> = {
	auto: 'Auto',
	flower: 'Flower',
	leaf: 'Leaf',
	fruit: 'Fruit',
	bark: 'Bark'
};

/** At most this many photos per identification (all of the same plant). */
export const MAX_PHOTOS = 5;

export interface Candidate {
	/** 0–1. */
	score: number;
	/** Without authorship, e.g. "Dioscorea bulbifera". */
	scientificName: string;
	authorship: string;
	commonNames: string[];
	family: string;
	genus: string;
}

export interface Identification {
	candidates: Candidate[];
	/** Identifications left today, when reported. */
	remaining?: number;
}

export type PlantNetErrorKind = 'key' | 'quota' | 'none' | 'network' | 'other';

export class PlantNetError extends Error {
	constructor(
		readonly kind: PlantNetErrorKind,
		message: string
	) {
		super(message);
		this.name = 'PlantNetError';
	}
}

/** Maps an HTTP failure to what the user can do about it. */
export function errorFor(status: number, body = ''): PlantNetError {
	if (status === 401 || status === 403) return new PlantNetError('key', body || 'Invalid API key');
	if (status === 429) return new PlantNetError('quota', body || 'Daily quota exceeded');
	if (status === 404) return new PlantNetError('none', body || 'Species not found');
	return new PlantNetError('other', body || `HTTP ${status}`);
}

interface RawResult {
	score?: number;
	species?: {
		scientificNameWithoutAuthor?: string;
		scientificNameAuthorship?: string;
		commonNames?: string[];
		genus?: { scientificNameWithoutAuthor?: string };
		family?: { scientificNameWithoutAuthor?: string };
	};
}

export function parseIdentification(json: {
	results?: RawResult[];
	remainingIdentificationRequests?: number;
}): Identification {
	const candidates = (json.results ?? [])
		.map((result) => ({
			score: result.score ?? 0,
			scientificName: result.species?.scientificNameWithoutAuthor?.trim() ?? '',
			authorship: result.species?.scientificNameAuthorship?.trim() ?? '',
			commonNames: [...new Set((result.species?.commonNames ?? []).map((n) => n.trim()))].filter(
				Boolean
			),
			family: result.species?.family?.scientificNameWithoutAuthor ?? '',
			genus: result.species?.genus?.scientificNameWithoutAuthor ?? ''
		}))
		.filter((candidate) => candidate.scientificName);
	return { candidates, remaining: json.remainingIdentificationRequests };
}

async function request(url: string, init: RequestInit): Promise<Response> {
	let response: Response;
	try {
		response = await fetch(url, init);
	} catch (error) {
		if (error instanceof DOMException && error.name === 'AbortError') throw error;
		// Offline, or blocked by CORS (this origin isn't an authorized domain of the key);
		// the browser doesn't say which.
		throw new PlantNetError('network', String(error));
	}
	if (!response.ok) {
		const body = await response.text().catch(() => '');
		let message = body;
		try {
			message = JSON.parse(body).message ?? body;
		} catch {
			// Not JSON.
		}
		throw errorFor(response.status, message);
	}
	return response;
}

/** Identifies the plant in 1–5 photos (JPEG/PNG) of the same individual. */
export async function identify(
	key: string,
	photos: { image: Blob; organ: Organ }[],
	signal?: AbortSignal
): Promise<Identification> {
	const body = new FormData();
	photos.forEach(({ image, organ }, i) => {
		body.append('images', image, `photo-${i + 1}.jpg`);
		body.append('organs', organ);
	});
	const params = new URLSearchParams({ 'api-key': key, lang: 'en', 'nb-results': '5' });
	const response = await request(`${API}/identify/all?${params}`, {
		method: 'POST',
		body,
		signal
	});
	return parseIdentification(await response.json());
}

/** Today's identification quota; doesn't use any. Also how a key is checked. */
export async function dailyQuota(
	key: string,
	signal?: AbortSignal
): Promise<{ remaining: number; total: number }> {
	const params = new URLSearchParams({ 'api-key': key });
	const response = await request(`${API}/quota/daily?${params}`, { signal });
	const json = await response.json();
	const identify = json.identify ?? {};
	return { remaining: Number(identify.remaining ?? 0), total: Number(identify.total ?? 0) };
}
