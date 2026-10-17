<script lang="ts">
	import Sheet from './Sheet.svelte';
	import SegmentedControl from './SegmentedControl.svelte';
	import Icon from './Icon.svelte';
	import PlantNetKeyForm from './PlantNetKeyForm.svelte';
	import { pwa } from '#lib/pwa.svelte.ts';
	import { plantnet } from '#lib/plantnet.svelte.ts';
	import { theme, type ThemePreference } from '#lib/theme.svelte.ts';
	import { APP_VERSION } from '#lib/version.ts';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	$effect(() => {
		if (open) plantnet.refreshQuota();
	});

	const options: { value: ThemePreference; label: string; icon: 'sun' | 'moon' | 'system' }[] = [
		{ value: 'light', label: 'Light', icon: 'sun' },
		{ value: 'dark', label: 'Dark', icon: 'moon' },
		{ value: 'system', label: 'Auto', icon: 'system' }
	];
</script>

<Sheet bind:open title="Settings">
	<section>
		<h3 class="eyebrow">Appearance</h3>
		<SegmentedControl
			label="Theme"
			{options}
			value={theme.preference}
			onchange={(value, event) => theme.set(value, { x: event.clientX, y: event.clientY })}
		/>
	</section>

	<section>
		<h3 class="eyebrow">Flower identification</h3>
		{#if plantnet.key}
			<div class="row">
				<span class="row-icon"><Icon name="scan" size={20} /></span>
				<span class="row-text">
					<span>Pl@ntNet connected</span>
					<span class="row-detail">
						{plantnet.remaining !== undefined && plantnet.total
							? `${plantnet.remaining} of ${plantnet.total} identifications left today`
							: 'Your key is saved on this device'}
					</span>
				</span>
				<button class="remove" onclick={() => plantnet.disconnect()}>Remove</button>
			</div>
		{:else}
			<PlantNetKeyForm />
		{/if}
	</section>

	{#if pwa.updateReady}
		<section>
			<h3 class="eyebrow">App</h3>
			<button class="row pressable" onclick={() => pwa.applyUpdate()}>
				<span class="row-icon accent"><Icon name="sparkle" size={20} /></span>
				<span class="row-text">
					<span>Update available</span>
					<span class="row-detail">Tap to restart into the new version</span>
				</span>
			</button>
		</section>
	{/if}

	<p class="about">Wildflower · {APP_VERSION}</p>
</Sheet>

<style>
	section {
		display: grid;
		gap: 10px;
	}

	section + section {
		margin-top: 22px;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 14px;
		width: 100%;
		padding: 12px 14px;
		border-radius: var(--radius-md);
		text-align: left;
		color: var(--color-text);
		background: color-mix(in srgb, var(--color-text) 5%, transparent);
	}

	.row-icon {
		flex-shrink: 0;
		display: grid;
		place-items: center;
		width: 38px;
		height: 38px;
		border-radius: 12px;
		color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 12%, transparent);
	}

	.row-icon.accent {
		color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 14%, transparent);
	}

	.row-text {
		flex: 1;
		display: grid;
		gap: 1px;
		font-weight: 600;
	}

	.row-detail {
		font-size: 13px;
		font-weight: 400;
		color: var(--color-text-muted);
	}

	.remove {
		flex-shrink: 0;
		padding: 8px 4px 8px 10px;
		font-size: 14px;
		font-weight: 550;
		color: var(--color-danger);
	}

	h3 {
		margin: 0;
		padding-left: 4px;
	}

	.about {
		margin: 24px 0 0;
		text-align: center;
		font-size: 12px;
		color: var(--color-text-faint);
	}
</style>
