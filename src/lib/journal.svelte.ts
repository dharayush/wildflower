import { browser } from '$app/env';
import { liveQuery } from 'dexie';
import { listFlowers, type FlowerWithCover } from './flowers.ts';
import { DEFAULT_ORDER, isSortOrder, type SortOrder } from './search.ts';

const ORDER_KEY = 'journal-order';

function readOrder(): SortOrder {
	try {
		const stored = localStorage.getItem(ORDER_KEY);
		if (isSortOrder(stored)) return stored;
	} catch {
		// Storage unavailable; use the default.
	}
	return DEFAULT_ORDER;
}

/**
 * App-wide live view of the journal. Kept outside components so the list is
 * already populated when navigating back from an entry, which lets the
 * thumbnail view transition morph back into place instead of popping in.
 */
class Journal {
	flowers = $state.raw<FlowerWithCover[]>();

	/** Pager page (0 = Journal, 1 = Database), remembered across navigation. */
	page = $state(0);

	/** Entrance animation should only play on first visit, not on every return. */
	introPlayed = false;

	/** Search stays open (with its query) when opening an entry and coming back. */
	searchOpen = $state(false);
	query = $state('');

	/** How the list is arranged; remembered across launches. */
	order = $state<SortOrder>(DEFAULT_ORDER);

	constructor() {
		if (!browser) return;
		this.order = readOrder();
		liveQuery(listFlowers).subscribe({
			next: (flowers) => (this.flowers = flowers),
			error: (error) => console.error('Failed to load journal', error)
		});
	}

	setOrder(order: SortOrder) {
		this.order = order;
		try {
			localStorage.setItem(ORDER_KEY, order);
		} catch {
			// Not persisted; still applies for this session.
		}
	}
}

export const journal = new Journal();
