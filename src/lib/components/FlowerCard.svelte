<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from './Icon.svelte';
	import { art } from '#lib/art.ts';
	import { photoUrl } from '#lib/photos.ts';
	import { formatDate } from '#lib/format.ts';
	import { highlight } from '#lib/search.ts';
	import type { FlowerWithCover } from '#lib/flowers.ts';

	let {
		flower,
		query = '',
		onmore
	}: {
		flower: FlowerWithCover;
		/** Active search, whose matches are highlighted in the name and species. */
		query?: string;
		onmore: () => void;
	} = $props();
</script>

{#snippet marked(text: string)}
	{#each highlight(text, query) as segment, i (i)}
		{#if segment.match}<mark>{segment.text}</mark>{:else}{segment.text}{/if}
	{/each}
{/snippet}

<article class="card glass">
	<a class="main pressable" href={resolve('/journal/[id]', { id: String(flower.id) })}>
		<div class="thumb" style:view-transition-name="flower-{flower.id}">
			<img
				src={flower.cover ? photoUrl(flower.cover) : art.flowerPlaceholder}
				alt=""
				loading="lazy"
				draggable="false"
			/>
		</div>
		<div class="text">
			<h3>{@render marked(flower.name)}</h3>
			{#if flower.species}<p class="species">{@render marked(flower.species)}</p>{/if}
			<p class="meta">
				{formatDate(flower.createdAt)}
				{#if flower.photoCount}
					<span class="dot">·</span>
					<Icon name="image" size={13} strokeWidth={2} />
					{flower.photoCount}
				{/if}
				{#if flower.linked}
					<span class="badge"><Icon name="check" size={11} strokeWidth={3} />Linked</span>
				{/if}
			</p>
		</div>
	</a>
	<button class="icon-btn more" aria-label="Options for {flower.name}" onclick={onmore}>
		<Icon name="more" />
	</button>
</article>

<style>
	.card {
		display: flex;
		align-items: center;
		border-radius: 24px;
		box-shadow:
			inset 0 1px 0 var(--glass-highlight),
			var(--shadow-sm);
	}

	.main {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 10px;
		color: inherit;
		text-decoration: none;
	}

	.thumb {
		width: 72px;
		height: 72px;
		flex-shrink: 0;
		border-radius: 18px;
		overflow: hidden;
		background: var(--color-separator);
		box-shadow: inset 0 0 0 1px var(--color-separator);
	}

	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.text {
		min-width: 0;
		display: grid;
		gap: 2px;
	}

	h3 {
		margin: 0;
		font-size: 17px;
		font-weight: 600;
		letter-spacing: -0.02em;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	p {
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.species {
		font-family: var(--font-display);
		font-style: italic;
		font-size: 16px;
		color: var(--color-text-muted);
	}

	.meta {
		display: flex;
		align-items: center;
		gap: 4px;
		margin-top: 2px;
		font-size: 12.5px;
		color: var(--color-text-faint);
		font-variant-numeric: tabular-nums;
	}

	.dot {
		margin: 0 2px;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		margin-left: 6px;
		padding: 2px 7px;
		border-radius: var(--radius-full);
		font-size: 11px;
		font-weight: 600;
		color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 14%, transparent);
	}

	mark {
		color: inherit;
		background: color-mix(in srgb, var(--color-primary) 22%, transparent);
		border-radius: 4px;
		box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-primary) 22%, transparent);
	}

	.more {
		margin-right: 6px;
		color: var(--color-text-muted);
	}
</style>
