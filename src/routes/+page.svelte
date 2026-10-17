<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from '#lib/components/Icon.svelte';
	import BrandScreen from '#lib/components/BrandScreen.svelte';
	import SecretNote from '#lib/components/SecretNote.svelte';

	// Tapping the orb does nothing visible beyond a ripple... unless it's tapped
	// TAPS_NEEDED times in a row, each within MAX_GAP_MS of the last.
	const TAPS_NEEDED = 30;
	const MAX_GAP_MS = 300;

	let taps = 0;
	let lastTap = 0;
	let secretOpen = $state(false);

	function tapOrb() {
		const now = performance.now();
		taps = now - lastTap <= MAX_GAP_MS ? taps + 1 : 1;
		lastTap = now;
		if (taps >= TAPS_NEEDED) {
			taps = 0;
			secretOpen = true;
		}
	}
</script>

<BrandScreen onorbpress={tapOrb}>
	<a class="btn btn-primary btn-block" href={resolve('/journal')}>
		Open Journal
		<Icon name="arrow" size={20} strokeWidth={2} />
	</a>
</BrandScreen>

{#if secretOpen}
	<SecretNote onclose={() => (secretOpen = false)} />
{/if}
