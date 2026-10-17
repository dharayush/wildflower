import { browser } from '$app/env';

export type Platform = 'ios' | 'android' | 'desktop';

/** Chromium's install prompt event (not in TypeScript's DOM lib). */
interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function detectPlatform(): Platform {
	const ua = navigator.userAgent;
	// iPadOS reports itself as a Mac; touch support gives it away.
	if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) {
		return 'ios';
	}
	return /Android/.test(ua) ? 'android' : 'desktop';
}

const standaloneQuery = () => window.matchMedia('(display-mode: standalone)');

/**
 * Install and update state for the PWA:
 * - captures the native install prompt (Android/desktop Chromium) so the app can offer
 *   its own "Install" button; iOS has no prompt, so the UI shows instructions instead
 * - asks the browser to keep stored journals from being evicted once installed
 * - surfaces a waiting service-worker update and applies it on request
 */
class Pwa {
	platform = $state<Platform>('desktop');
	/** Running as an installed app (home screen / app window). */
	installed = $state(false);
	/** The app was just installed from this browser tab (Chromium reports this; iOS doesn't). */
	justInstalled = $state(false);
	/** A native install prompt is available (Chromium only, until used). */
	canPrompt = $state(false);
	/** A new version has downloaded and is waiting to be applied. */
	updateReady = $state(false);
	/** The step-by-step install guide (rendered by the root layout) is open. */
	guideOpen = $state(false);

	#prompt: BeforeInstallPromptEvent | undefined;
	#applyingUpdate = false;

	constructor() {
		if (!browser) return;

		this.platform = detectPlatform();
		this.installed =
			standaloneQuery().matches || (navigator as { standalone?: boolean }).standalone === true;
		standaloneQuery().addEventListener('change', (e) => (this.installed = e.matches));

		window.addEventListener('beforeinstallprompt', (event) => {
			event.preventDefault();
			this.#prompt = event as BeforeInstallPromptEvent;
			this.canPrompt = true;
		});
		window.addEventListener('appinstalled', () => {
			this.#prompt = undefined;
			this.canPrompt = false;
			this.justInstalled = true;
			this.persistStorage();
		});

		if (this.installed) this.persistStorage();
		this.#watchForUpdates();
	}

	/** Starts installing: the native dialog where the browser offers one, else the guide. */
	install() {
		if (this.canPrompt) this.promptInstall();
		else this.guideOpen = true;
	}

	/** Shows the native install dialog. Resolves to whether the user accepted. */
	async promptInstall(): Promise<boolean> {
		const prompt = this.#prompt;
		if (!prompt) return false;
		// Each prompt event can only be used once.
		this.#prompt = undefined;
		this.canPrompt = false;
		await prompt.prompt();
		return (await prompt.userChoice).outcome === 'accepted';
	}

	/** Asks the browser not to clear the journal under storage pressure (best effort). */
	async persistStorage() {
		try {
			if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
				await navigator.storage.persist();
			}
		} catch {
			// Unsupported or refused; data is still stored, just not guaranteed.
		}
	}

	/** Activates the waiting version, then reloads into it. */
	async applyUpdate() {
		const registration = await navigator.serviceWorker?.getRegistration();
		if (!registration?.waiting) {
			location.reload();
			return;
		}
		this.#applyingUpdate = true;
		registration.waiting.postMessage('skip-waiting');
	}

	async #watchForUpdates() {
		if (!('serviceWorker' in navigator)) return;
		const container = navigator.serviceWorker;

		container.addEventListener('controllerchange', () => {
			// Only reload for an update the user asked for — the very first install also
			// fires this event (when the worker claims the page), and must not reload.
			if (this.#applyingUpdate) location.reload();
		});

		// Resolves once a worker is active (never in dev, where there is none).
		const registration = await container.ready;
		const markIfWaiting = () => {
			if (registration.waiting && container.controller) this.updateReady = true;
		};

		markIfWaiting();
		registration.addEventListener('updatefound', () => {
			const worker = registration.installing;
			worker?.addEventListener('statechange', () => {
				if (worker.state === 'installed') markIfWaiting();
			});
		});

		// Installed apps can stay open for days: check for a new version whenever
		// the app returns to the foreground.
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'visible') registration.update().catch(() => {});
		});
	}
}

export const pwa = new Pwa();
