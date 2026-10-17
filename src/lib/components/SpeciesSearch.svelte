<script lang="ts">
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Icon from './Icon.svelte';
	import SpeciesThumb from './SpeciesThumb.svelte';
	import { findSpecies } from '#lib/database.svelte.ts';
	import { highlight } from '#lib/search.ts';
	import type { Species } from '#lib/species.ts';

	let {
		initialQuery = '',
		backLabel = 'Back to form',
		onselect,
		oncancel
	}: {
		initialQuery?: string;
		backLabel?: string;
		onselect: (species: Species) => void;
		oncancel: () => void;
	} = $props();

	// svelte-ignore state_referenced_locally
	let query = $state(initialQuery);
	let results = $state<Species[]>([]);
	/** No species matched every word; these match some. */
	let partial = $state(false);
	let searching = $state(false);
	let failed = $state(false);

	// Debounced search; stale responses are dropped if the query changed meanwhile.
	$effect(() => {
		const q = query.trim();
		if (!q) {
			results = [];
			searching = false;
			return;
		}
		searching = true;
		const timer = setTimeout(async () => {
			try {
				const found = await findSpecies(q);
				if (q !== query.trim()) return;
				results = found.results;
				partial = found.partial;
				failed = false;
			} catch {
				failed = true;
			}
			searching = false;
		}, 150);
		return () => clearTimeout(timer);
	});
</script>

{#snippet marked(text: string)}
	{#each highlight(text, query) as segment, i (i)}
		{#if segment.match}<mark>{segment.text}</mark>{:else}{segment.text}{/if}
	{/each}
{/snippet}

<div class="search" in:fly={{ x: 40, duration: 320, easing: cubicOut }}>
	<div class="bar">
		<button type="button" class="icon-btn back" aria-label={backLabel} onclick={oncancel}>
			<Icon name="back" strokeWidth={2} />
		</button>
		<label class="field-wrap">
			<Icon name="search" size={18} />
			<!-- svelte-ignore a11y_autofocus -->
			<input
				class="query"
				type="search"
				bind:value={query}
				placeholder="Common or botanical name"
				aria-label="Search the flower database"
				autocomplete="off"
				autocorrect="off"
				spellcheck="false"
				enterkeyhint="search"
				autofocus
			/>
		</label>
	</div>

	{#if failed}
		<div class="state">
			<span class="state-icon"><Icon name="database" size={26} /></span>
			<h3>Database unavailable</h3>
			<p>It couldn’t be loaded. Check your connection and try again.</p>
		</div>
	{:else if results.length}
		{#if partial}
			<p class="partial">No exact match for “{query.trim()}”. Closest flowers:</p>
		{/if}
		<ul class="results">
			{#each results as species (species.id)}
				<li>
					<button type="button" class="result pressable" onclick={() => onselect(species)}>
						<SpeciesThumb src={species.image} size={44} />
						<span class="names">
							<span class="common">{@render marked(species.name)}</span>
							<span class="scientific">{@render marked(species.botanical)}</span>
						</span>
					</button>
				</li>
			{/each}
		</ul>
	{:else if query.trim() && !searching}
		<div class="state">
			<h3>No matches</h3>
			<p>Try a different spelling, or enter the details yourself.</p>
		</div>
	{:else if !query.trim()}
		<div class="state">
			<span class="state-icon"><Icon name="database" size={26} /></span>
			<h3>Search the flower database</h3>
			<p>Type a common, botanical, or local name to fill in the details.</p>
		</div>
	{/if}
</div>

<style>
	.search {
		display: grid;
		gap: 16px;
		min-height: 240px;
		align-content: start;
	}

	.bar {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.back {
		color: var(--color-text);
		background: color-mix(in srgb, var(--color-text) 6%, transparent);
	}

	.field-wrap {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 10px;
		height: 50px;
		padding: 0 16px;
		border-radius: var(--radius-full);
		color: var(--color-text-muted);
		border: 1px solid var(--color-separator);
		background: color-mix(in srgb, var(--color-bg) 60%, transparent);
		transition:
			border-color 200ms ease,
			box-shadow 200ms ease;
	}

	.field-wrap:focus-within {
		border-color: color-mix(in srgb, var(--color-primary) 60%, transparent);
		box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-primary) 15%, transparent);
	}

	.query {
		flex: 1;
		min-width: 0;
		height: 100%;
		border: none;
		background: none;
		outline: none;
		font-size: 16px;
		color: var(--color-text);
	}

	.query::-webkit-search-cancel-button {
		-webkit-appearance: none;
		appearance: none;
	}

	.query::placeholder {
		color: var(--color-text-faint);
	}

	.state {
		display: grid;
		justify-items: center;
		text-align: center;
		gap: 6px;
		padding: 20px 12px 8px;
	}

	.state-icon {
		display: grid;
		place-items: center;
		width: 56px;
		height: 56px;
		margin-bottom: 6px;
		border-radius: 18px;
		color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 12%, transparent);
	}

	.state h3 {
		margin: 0;
		font-size: 17px;
		font-weight: 650;
		letter-spacing: -0.02em;
	}

	.state p {
		margin: 0;
		max-width: 32ch;
		font-size: 14px;
		color: var(--color-text-muted);
	}

	.partial {
		margin: -4px 4px 0;
		font-size: 13.5px;
		color: var(--color-text-muted);
	}

	.results {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 6px;
	}

	.result {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 14px 8px 8px;
		border-radius: var(--radius-md);
		text-align: left;
		background: color-mix(in srgb, var(--color-text) 5%, transparent);
	}

	.names {
		min-width: 0;
		display: grid;
		gap: 1px;
	}

	.common,
	.scientific {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.common {
		font-weight: 600;
	}

	.scientific {
		font-family: var(--font-display);
		font-style: italic;
		font-size: 16px;
		color: var(--color-text-muted);
	}

	mark {
		color: inherit;
		background: color-mix(in srgb, var(--color-primary) 22%, transparent);
		border-radius: 4px;
	}
</style>
