<script lang="ts">
	import Icon from './Icon.svelte';
	import BrandScreen from './BrandScreen.svelte';
	import { access } from '#lib/access.svelte.ts';

	let password = $state('');
	let checking = $state(false);
	let wrong = $state(false);
	let input = $state<HTMLInputElement>();

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!password || checking) return;
		checking = true;
		wrong = false;
		const ok = await access.unlock(password);
		checking = false;
		if (!ok) {
			wrong = true;
			password = '';
			input?.focus();
			navigator.vibrate?.([30, 40, 30]);
		}
	}
</script>

<!-- Shown before anything else on the hosted app; the root layout decides when. -->
<svelte:head>
	<title>Wildflower</title>
</svelte:head>

<BrandScreen>
	{#if access.configured}
		<form class="form" class:wrong onsubmit={submit}>
			<label class="field glass">
				<Icon name="lock" size={18} />
				<!-- svelte-ignore a11y_autofocus -->
				<input
					bind:this={input}
					bind:value={password}
					type="password"
					placeholder="Password"
					aria-label="Password"
					aria-invalid={wrong}
					autocomplete="current-password"
					enterkeyhint="go"
					autofocus
					oninput={() => (wrong = false)}
				/>
			</label>
			<button class="btn btn-primary btn-block" disabled={!password || checking}>
				{checking ? 'Checking…' : 'Unlock'}
			</button>
			<p class="fineprint" aria-live="polite">
				{wrong ? 'That’s not the password. Try again.' : 'Enter the password to continue.'}
			</p>
		</form>
	{:else}
		<p class="fineprint">This app isn’t open yet.</p>
	{/if}
</BrandScreen>

<style>
	.form {
		display: grid;
		gap: 12px;
		width: 100%;
	}

	.field {
		display: flex;
		align-items: center;
		gap: 10px;
		height: 54px;
		padding: 0 18px;
		border-radius: var(--radius-full);
		color: var(--color-text-muted);
		transition: box-shadow 200ms ease;
	}

	.field:focus-within {
		box-shadow:
			inset 0 1px 0 var(--glass-highlight),
			var(--shadow-md),
			0 0 0 3px color-mix(in srgb, var(--color-primary) 14%, transparent);
	}

	input {
		flex: 1;
		min-width: 0;
		height: 100%;
		border: none;
		background: none;
		font: inherit;
		font-size: 16px;
		color: var(--color-text);
		outline: none;
	}

	input::placeholder {
		color: var(--color-text-faint);
	}

	.wrong .field {
		animation: shake 380ms var(--ease-out);
		box-shadow:
			inset 0 1px 0 var(--glass-highlight),
			0 0 0 2px color-mix(in srgb, var(--color-danger) 45%, transparent);
	}

	.wrong .fineprint {
		color: var(--color-danger);
	}

	@keyframes shake {
		20%,
		60% {
			transform: translateX(-6px);
		}
		40%,
		80% {
			transform: translateX(6px);
		}
	}
</style>
