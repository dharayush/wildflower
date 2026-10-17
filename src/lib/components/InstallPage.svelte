<script lang="ts">
	import { scale } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import Icon from './Icon.svelte';
	import BrandScreen from './BrandScreen.svelte';
	import { pwa } from '#lib/pwa.svelte.ts';
</script>

<!--
	What the shared link shows in a browser tab. Wildflower is only usable as an installed
	app (on iOS, the home-screen app and Safari don't even share storage), so the browser
	only offers installation. The root layout decides which one to render.
-->
<svelte:head>
	<title>Install Wildflower</title>
</svelte:head>

<BrandScreen>
	{#if pwa.justInstalled}
		<div class="installed glass" in:scale={{ start: 0.9, duration: 500, easing: backOut }}>
			<span class="check"><Icon name="check" size={22} strokeWidth={2.4} /></span>
			<span class="text">
				<span class="title">Installed!</span>
				<span class="detail">Open Wildflower from your home screen.</span>
			</span>
		</div>
	{:else}
		<button class="btn btn-primary btn-block" onclick={() => pwa.install()}>
			<Icon name="download" size={20} strokeWidth={2} />
			Install app
		</button>
		<p class="fineprint">Already installed? Open Wildflower from your home screen.</p>
	{/if}
</BrandScreen>

<style>
	.installed {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 14px 18px;
		border-radius: var(--radius-lg);
		text-align: left;
	}

	.check {
		flex-shrink: 0;
		display: grid;
		place-items: center;
		width: 42px;
		height: 42px;
		border-radius: var(--radius-full);
		color: var(--color-primary-text);
		background: var(--color-primary);
	}

	.text {
		display: grid;
		gap: 1px;
	}

	.title {
		font-weight: 650;
		letter-spacing: -0.02em;
	}

	.detail {
		font-size: 14px;
		color: var(--color-text-muted);
	}
</style>
