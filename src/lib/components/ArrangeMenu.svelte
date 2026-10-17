<script lang="ts" generics="T extends string">
	import { scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Icon from './Icon.svelte';

	let {
		options,
		value,
		defaultValue,
		label = 'Arrange',
		onchange
	}: {
		options: readonly { value: T; label: string; group: string }[];
		value: T;
		/** Any other choice shows a dot on the button. */
		defaultValue: T;
		label?: string;
		onchange: (order: T) => void;
	} = $props();

	let open = $state(false);
	let root = $state<HTMLElement>();

	const groups = $derived([...new Set(options.map((order) => order.group))]);

	function choose(order: T) {
		onchange(order);
		open = false;
	}

	// Dismiss on any tap outside the menu, or Escape.
	$effect(() => {
		if (!open) return;
		const onpointerdown = (event: PointerEvent) => {
			if (!root?.contains(event.target as Node)) open = false;
		};
		const onkeydown = (event: KeyboardEvent) => event.key === 'Escape' && (open = false);
		window.addEventListener('pointerdown', onpointerdown, true);
		window.addEventListener('keydown', onkeydown);
		return () => {
			window.removeEventListener('pointerdown', onpointerdown, true);
			window.removeEventListener('keydown', onkeydown);
		};
	});
</script>

<div class="arrange" bind:this={root}>
	<button
		class="icon-btn glass trigger"
		class:open
		aria-label={label}
		aria-haspopup="menu"
		aria-expanded={open}
		onclick={() => (open = !open)}
	>
		<Icon name="arrange" size={20} />
		{#if value !== defaultValue}<span class="dot" aria-hidden="true"></span>{/if}
	</button>

	{#if open}
		<div
			class="menu glass glass-strong"
			role="menu"
			aria-label={label}
			transition:scale={{ start: 0.9, duration: 220, easing: cubicOut }}
		>
			{#each groups as group (group)}
				<div class="group" role="group" aria-label={group}>
					<p class="eyebrow">{group}</p>
					{#each options.filter((order) => order.group === group) as order (order.value)}
						<button
							class="item"
							class:selected={order.value === value}
							role="menuitemradio"
							aria-checked={order.value === value}
							onclick={() => choose(order.value)}
						>
							{order.label}
							{#if order.value === value}<Icon name="check" size={17} strokeWidth={2.4} />{/if}
						</button>
					{/each}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.arrange {
		position: relative;
	}

	.trigger {
		position: relative;
		color: var(--color-text);
		transition:
			transform 220ms var(--ease-spring),
			background-color 200ms ease;
	}

	.trigger.open {
		background: color-mix(in srgb, var(--color-text) 10%, var(--glass-bg));
	}

	/* Marks a non-default arrangement, so a reordered list never looks like a mystery. */
	.dot {
		position: absolute;
		top: 9px;
		right: 9px;
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--color-primary);
		box-shadow: 0 0 0 2px var(--glass-bg-strong);
	}

	.menu {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		z-index: 20;
		width: 210px;
		padding: 6px;
		border-radius: var(--radius-md);
		box-shadow:
			inset 0 1px 0 var(--glass-highlight),
			var(--shadow-lg);
		transform-origin: top right;
	}

	.group + .group {
		margin-top: 4px;
		padding-top: 4px;
		border-top: 1px solid var(--color-separator);
	}

	.eyebrow {
		margin: 0;
		padding: 8px 10px 4px;
	}

	.item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		height: 42px;
		padding: 0 10px;
		border-radius: calc(var(--radius-md) - 6px);
		font-size: 15px;
		font-weight: 500;
		text-align: left;
		color: var(--color-text);
		transition: background-color 150ms ease;
	}

	.item:active {
		background: color-mix(in srgb, var(--color-text) 7%, transparent);
	}

	.item.selected {
		font-weight: 600;
		color: var(--color-primary);
	}
</style>
