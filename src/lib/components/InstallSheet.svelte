<script lang="ts">
	import { asset } from '$app/paths';
	import Sheet from './Sheet.svelte';
	import Icon from './Icon.svelte';
	import type { IconName } from '#lib/icons.ts';
	import { pwa, type Platform } from '#lib/pwa.svelte.ts';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	type Step = { icon: IconName; title: string; detail: string };

	const steps: Record<Platform, Step[]> = {
		ios: [
			{
				icon: 'share',
				title: 'Tap the Share button',
				detail: 'In Safari’s toolbar — on newer iPhones, tap ••• first.'
			},
			{
				icon: 'add-square',
				title: 'Choose “Add to Home Screen”',
				detail: 'Scroll down the list if you don’t see it.'
			},
			{
				icon: 'check',
				title: 'Tap “Add”',
				detail: 'Wildflower appears on your Home Screen.'
			}
		],
		android: [
			{
				icon: 'menu-vertical',
				title: 'Open the browser menu',
				detail: 'The ⋮ button at the top right in Chrome.'
			},
			{
				icon: 'download',
				title: 'Tap “Install app”',
				detail: 'Some browsers call it “Add to Home screen”.'
			},
			{
				icon: 'check',
				title: 'Confirm',
				detail: 'Wildflower appears with your other apps.'
			}
		],
		desktop: [
			{
				icon: 'download',
				title: 'Use your browser’s install button',
				detail: 'Look for the install icon in the address bar, or in the browser menu.'
			},
			{
				icon: 'check',
				title: 'Confirm',
				detail: 'Wildflower opens in its own window.'
			}
		]
	};
</script>

<Sheet bind:open title="Install Wildflower">
	<div class="app">
		<img src={asset('pwa-192x192.png')} alt="" width="56" height="56" />
		<div>
			<p class="name">Wildflower</p>
			<p class="perks">Works offline · No account · Your journal stays on this device</p>
		</div>
	</div>

	<ol>
		{#each steps[pwa.platform] as step, i (step.title)}
			<li style:--i={i}>
				<span class="badge"><Icon name={step.icon} size={20} /></span>
				<span class="text">
					<span class="title">{step.title}</span>
					<span class="detail">{step.detail}</span>
				</span>
			</li>
		{/each}
	</ol>

	<button class="btn btn-primary btn-block" onclick={() => (open = false)}>Got it</button>
</Sheet>

<style>
	.app {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 4px 4px 18px;
		border-bottom: 1px solid var(--color-separator);
	}

	.app img {
		border-radius: 14px;
		box-shadow: var(--shadow-sm);
	}

	.app p {
		margin: 0;
	}

	.name {
		font-weight: 650;
		letter-spacing: -0.02em;
	}

	.perks {
		font-size: 13px;
		color: var(--color-text-muted);
	}

	ol {
		list-style: none;
		margin: 0;
		padding: 18px 0 22px;
		display: grid;
		gap: 16px;
	}

	li {
		display: flex;
		align-items: center;
		gap: 14px;
		animation: step-in 500ms var(--ease-out) both;
		animation-delay: calc(var(--i) * 80ms + 120ms);
	}

	.badge {
		flex-shrink: 0;
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border-radius: 14px;
		color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 12%, transparent);
	}

	.text {
		display: grid;
		gap: 1px;
	}

	.title {
		font-weight: 600;
	}

	.detail {
		font-size: 14px;
		color: var(--color-text-muted);
	}

	@keyframes step-in {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
	}
</style>
