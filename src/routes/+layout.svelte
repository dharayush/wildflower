<script lang="ts">
	import '../app.css';
	import { untrack } from 'svelte';
	import { onNavigate } from '$app/navigation';
	import { dev } from '$app/env';
	import Backdrop from '#lib/components/Backdrop.svelte';
	import Toaster from '#lib/components/Toaster.svelte';
	import InstallSheet from '#lib/components/InstallSheet.svelte';
	import InstallPage from '#lib/components/InstallPage.svelte';
	import PasswordPage from '#lib/components/PasswordPage.svelte';
	import { access } from '#lib/access.svelte.ts';
	import '#lib/theme.svelte.ts';
	import { pwa } from '#lib/pwa.svelte.ts';
	import { toasts } from '#lib/toast.svelte.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// First the password, then (in a browser tab) only installation; the full app runs once
	// unlocked and installed. `npm run dev` skips both gates.
	const gated = $derived(!access.unlocked || (!dev && !pwa.installed));

	$effect(() => {
		if (gated || !pwa.updateReady) return;
		// untrack: show() reads the toast list, which must not re-trigger this effect.
		untrack(() =>
			toasts.show('A new version is ready', {
				action: { label: 'Update', run: () => pwa.applyUpdate() },
				duration: null
			})
		);
	});

	// Cross-fade between pages and morph elements sharing a `view-transition-name`
	// (e.g. a journal thumbnail into the entry's hero photo).
	onNavigate((navigation) => {
		if (!document.startViewTransition || navigation.from?.route.id === navigation.to?.route.id) {
			return;
		}
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<Backdrop />
{#if !access.unlocked}
	<PasswordPage />
{:else if gated}
	<InstallPage />
{:else}
	{@render children()}
{/if}
<Toaster />
<InstallSheet bind:open={pwa.guideOpen} />
