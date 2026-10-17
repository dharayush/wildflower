<script lang="ts">
	import Icon from './Icon.svelte';
	import { plantnet } from '#lib/plantnet.svelte.ts';
	import { PlantNetError } from '#lib/plantnet.ts';

	let { onconnected }: { onconnected?: () => void } = $props();

	const uid = $props.id();
	let key = $state('');
	let checking = $state(false);
	let error = $state<string>();

	async function onsubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!key.trim() || checking) return;
		checking = true;
		error = undefined;
		try {
			await plantnet.connect(key);
			key = '';
			onconnected?.();
		} catch (failure) {
			error = message(failure);
		} finally {
			checking = false;
		}
	}

	function message(failure: unknown): string {
		if (failure instanceof PlantNetError && failure.kind === 'key') {
			return 'Pl@ntNet didn’t accept this key. Check that it’s copied in full.';
		}
		if (failure instanceof PlantNetError && failure.kind === 'network') {
			return `Couldn’t reach Pl@ntNet. If you’re online, tick “expose my API key” and add ${location.origin} as an authorized domain in your key’s settings.`;
		}
		return 'Something went wrong checking the key. Try again.';
	}
</script>

<form class="form" {onsubmit}>
	<label class="label" for="{uid}-key">Pl@ntNet API key</label>
	<div class="row">
		<input
			id="{uid}-key"
			class="input key"
			bind:value={key}
			placeholder="Paste your key"
			autocomplete="off"
			autocapitalize="off"
			spellcheck="false"
			enterkeyhint="done"
			aria-invalid={!!error}
			oninput={() => (error = undefined)}
		/>
		<button class="btn btn-primary connect" disabled={!key.trim() || checking}>
			{checking ? 'Checking…' : 'Connect'}
		</button>
	</div>
	{#if error}
		<p class="error" role="alert">{error}</p>
	{:else}
		<p class="help">
			Get a free key at
			<a href="https://my.plantnet.org/settings/api-key" target="_blank" rel="noopener"
				>my.plantnet.org<Icon name="external" size={11} strokeWidth={2.2} /></a
			>
			(500 identifications a day). It stays on this device and is only sent to Pl@ntNet.
		</p>
	{/if}
</form>

<style>
	.form {
		display: grid;
		gap: 8px;
	}

	.label {
		padding-left: 4px;
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text-muted);
	}

	.row {
		display: flex;
		gap: 8px;
	}

	.key {
		flex: 1;
		min-width: 0;
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 14px;
	}

	.connect {
		flex-shrink: 0;
		height: 50px;
		padding: 0 18px;
	}

	.help,
	.error {
		margin: 0;
		padding: 0 4px;
		font-size: 12.5px;
		line-height: 1.45;
		color: var(--color-text-muted);
	}

	.help a {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		white-space: nowrap;
		color: var(--color-primary);
		font-weight: 550;
	}

	.error {
		color: var(--color-danger);
	}
</style>
