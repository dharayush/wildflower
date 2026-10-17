import { browser } from '$app/env';
import { dailyQuota } from './plantnet.ts';

const KEY = 'plantnet-key';
const NOTICE = 'plantnet-notice-seen';

function read(key: string) {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

function write(key: string, value: string | null) {
	try {
		if (value === null) localStorage.removeItem(key);
		else localStorage.setItem(key, value);
	} catch {
		// Not persisted; still applies for this session.
	}
}

/**
 * The user's Pl@ntNet API key and quota. The key lives only on this device (never in the
 * app's code, which is public), and is sent only to Pl@ntNet.
 */
class PlantNet {
	key = $state<string>();
	/** Identifications left today, as last reported by Pl@ntNet. */
	remaining = $state<number>();
	total = $state<number>();
	/** Whether the "photos are sent to Pl@ntNet" notice has been acknowledged. */
	noticeSeen = $state(false);

	constructor() {
		if (!browser) return;
		this.key = read(KEY) ?? undefined;
		this.noticeSeen = read(NOTICE) === '1';
	}

	/** Checks the key with Pl@ntNet (without using an identification), then saves it. */
	async connect(key: string) {
		const trimmed = key.trim();
		const quota = await dailyQuota(trimmed);
		this.key = trimmed;
		this.remaining = quota.remaining;
		this.total = quota.total;
		write(KEY, trimmed);
	}

	/** Refreshes the quota shown in Settings; failures (e.g. offline) are ignored. */
	async refreshQuota() {
		if (!this.key) return;
		try {
			const quota = await dailyQuota(this.key);
			this.remaining = quota.remaining;
			this.total = quota.total;
		} catch {
			// Keep the last known numbers.
		}
	}

	disconnect() {
		this.key = undefined;
		this.remaining = undefined;
		this.total = undefined;
		write(KEY, null);
	}

	acknowledgeNotice() {
		this.noticeSeen = true;
		write(NOTICE, '1');
	}
}

export const plantnet = new PlantNet();
