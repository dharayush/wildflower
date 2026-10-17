import { browser } from '$app/env';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme';

// Must match --color-bg in app.css so the status bar blends with the page.
const THEME_COLORS = { light: '#f3f1ec', dark: '#0c0e0d' } as const;

const media = () => window.matchMedia('(prefers-color-scheme: dark)');

// Light unless the user has picked something else (including following the system).
const DEFAULT_PREFERENCE: ThemePreference = 'light';

function readPreference(): ThemePreference {
	if (!browser) return DEFAULT_PREFERENCE;
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
	} catch {
		// Storage can be unavailable (private mode); fall through to the default.
	}
	return DEFAULT_PREFERENCE;
}

function resolve(preference: ThemePreference): 'light' | 'dark' {
	if (preference !== 'system') return preference;
	return media().matches ? 'dark' : 'light';
}

function apply(preference: ThemePreference) {
	const resolved = resolve(preference);
	document.documentElement.dataset.theme = resolved;
	document
		.querySelector('meta[name="theme-color"]')
		?.setAttribute('content', THEME_COLORS[resolved]);
}

class Theme {
	preference = $state<ThemePreference>(readPreference());

	constructor() {
		if (!browser) return;
		apply(this.preference);
		media().addEventListener('change', () => {
			if (this.preference === 'system') apply('system');
		});
	}

	/**
	 * Switches theme, revealing the new one in a circle growing from `origin`
	 * (usually the tapped control) where View Transitions are supported.
	 */
	set(preference: ThemePreference, origin?: { x: number; y: number }) {
		const changed = resolve(preference) !== resolve(this.preference);
		this.preference = preference;
		try {
			localStorage.setItem(STORAGE_KEY, preference);
		} catch {
			// Not persisted; still applies for this session.
		}

		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (!changed || !document.startViewTransition || reduceMotion) {
			apply(preference);
			return;
		}

		const root = document.documentElement;
		root.dataset.themeTransition = '';
		const transition = document.startViewTransition(() => apply(preference));
		transition.ready.then(() => {
			const x = origin?.x ?? innerWidth / 2;
			const y = origin?.y ?? 0;
			const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
			root.animate(
				{ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
				{
					duration: 550,
					easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
					pseudoElement: '::view-transition-new(root)'
				}
			);
		});
		transition.finished.finally(() => delete root.dataset.themeTransition);
	}
}

export const theme = new Theme();
