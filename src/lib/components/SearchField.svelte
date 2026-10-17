<script lang="ts">
	import Icon from './Icon.svelte';

	let {
		value = $bindable(''),
		placeholder,
		label
	}: { value?: string; placeholder: string; label: string } = $props();

	let input = $state<HTMLInputElement>();

	function clear() {
		value = '';
		input?.focus();
	}
</script>

<label class="field glass">
	<Icon name="search" size={18} />
	<!-- svelte-ignore a11y_autofocus -->
	<input
		bind:this={input}
		bind:value
		type="search"
		{placeholder}
		aria-label={label}
		autocomplete="off"
		autocorrect="off"
		spellcheck="false"
		enterkeyhint="search"
		autofocus
		onkeydown={(event) => event.key === 'Enter' && input?.blur()}
	/>
	{#if value}
		<button type="button" class="clear" aria-label="Clear search" onclick={clear}>
			<span class="clear-dot"><Icon name="close" size={13} strokeWidth={2.6} /></span>
		</button>
	{/if}
</label>

<style>
	.field {
		display: flex;
		align-items: center;
		gap: 10px;
		height: 48px;
		padding: 0 6px 0 16px;
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
		outline: none;
		font-size: 16px;
		color: var(--color-text);
	}

	input::-webkit-search-cancel-button {
		-webkit-appearance: none;
		appearance: none;
	}

	input::placeholder {
		color: var(--color-text-faint);
	}

	/* Large tap target around a small visual dot. */
	.clear {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 36px;
		height: 36px;
		color: var(--color-text-muted);
	}

	.clear-dot {
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: color-mix(in srgb, var(--color-text) 10%, transparent);
	}
</style>
