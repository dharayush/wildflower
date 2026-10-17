<script lang="ts" generics="T extends string">
	import Icon from './Icon.svelte';
	import type { IconName } from '#lib/icons.ts';

	let {
		options,
		value,
		onchange,
		label
	}: {
		options: { value: T; label: string; icon?: IconName }[];
		value: T;
		onchange: (value: T, event: MouseEvent) => void;
		label: string;
	} = $props();

	const index = $derived(options.findIndex((o) => o.value === value));
</script>

<div class="segmented" role="radiogroup" aria-label={label} style:--count={options.length}>
	<div class="thumb" style:--index={index}></div>
	{#each options as option (option.value)}
		<button
			role="radio"
			aria-checked={option.value === value}
			class:active={option.value === value}
			onclick={(event) => onchange(option.value, event)}
		>
			{#if option.icon}<Icon name={option.icon} size={18} />{/if}
			{option.label}
		</button>
	{/each}
</div>

<style>
	.segmented {
		position: relative;
		display: grid;
		grid-template-columns: repeat(var(--count), 1fr);
		padding: 4px;
		border-radius: var(--radius-full);
		background: color-mix(in srgb, var(--color-text) 6%, transparent);
	}

	.thumb {
		position: absolute;
		top: 4px;
		bottom: 4px;
		left: 4px;
		width: calc((100% - 8px) / var(--count));
		border-radius: var(--radius-full);
		background: var(--glass-bg-strong);
		box-shadow:
			inset 0 1px 0 var(--glass-highlight),
			var(--shadow-sm);
		transform: translateX(calc(var(--index) * 100%));
		transition: transform 420ms var(--ease-spring);
	}

	button {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		height: 40px;
		font-size: 14px;
		font-weight: 550;
		color: var(--color-text-muted);
		transition: color 200ms ease;
	}

	button.active {
		color: var(--color-text);
	}
</style>
