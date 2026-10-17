<script lang="ts">
	let {
		pages,
		progress,
		onselect
	}: {
		pages: readonly { label: string }[];
		/** Continuous scroll position, 0 … pages.length - 1. */
		progress: number;
		onselect: (index: number) => void;
	} = $props();

	const active = $derived(Math.round(progress));
</script>

<div class="indicator glass" role="tablist" style:--count={pages.length}>
	<div class="thumb" style:transform="translateX({progress * 100}%)"></div>
	{#each pages as page, i (page.label)}
		<button
			role="tab"
			aria-selected={i === active}
			class:active={i === active}
			onclick={() => onselect(i)}
		>
			{page.label}
		</button>
	{/each}
</div>

<style>
	.indicator {
		position: relative;
		display: grid;
		grid-template-columns: repeat(var(--count), 1fr);
		padding: 3px;
		border-radius: var(--radius-sm);
	}

	/* Inner radius = outer radius − padding, so the thumb's corners nest concentrically. */
	.thumb {
		position: absolute;
		top: 3px;
		bottom: 3px;
		left: 3px;
		width: calc((100% - 6px) / var(--count));
		border-radius: calc(var(--radius-sm) - 3px);
		background: var(--color-text);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, var(--color-bg) 18%, transparent),
			var(--shadow-sm);
		will-change: transform;
	}

	button {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 34px;
		padding: 0 18px;
		font-size: 13.5px;
		font-weight: 600;
		letter-spacing: 0.01em;
		color: var(--color-text-muted);
		transition: color 250ms ease;
	}

	button.active {
		color: var(--color-bg);
	}
</style>
