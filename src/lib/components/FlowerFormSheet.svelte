<script lang="ts">
	import { untrack } from 'svelte';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Sheet from './Sheet.svelte';
	import Icon from './Icon.svelte';
	import SpeciesSearch from './SpeciesSearch.svelte';
	import type { Flower } from '#lib/db.ts';
	import type { Species } from '#lib/species.ts';
	import { createFlower, editFlowerDetails, type FlowerDetails } from '#lib/flowers.ts';
	import { pwa } from '#lib/pwa.svelte.ts';

	let {
		open = $bindable(false),
		flower,
		initial,
		oncreated
	}: {
		open?: boolean;
		/** Present when editing; absent when creating. */
		flower?: Pick<Flower, 'id' | 'name' | 'species' | 'speciesId'>;
		/** Prefilled details for a new entry (e.g. from a database species). */
		initial?: FlowerDetails;
		oncreated?: (id: number) => void;
	} = $props();

	const uid = $props.id();

	let name = $state('');
	let species = $state('');
	/** Linked database species, kept while the species field still names it. */
	let speciesId = $state<number>();
	let linkedName = '';
	let saving = $state(false);
	let searching = $state(false);
	/** Skip the slide-in on first open; only animate when returning from search. */
	let returningFromSearch = $state(false);

	// Reset fields each time the sheet opens (but not when `flower` live-updates while typing).
	$effect(() => {
		if (!open) return;
		untrack(() => {
			const details = flower ?? initial;
			name = details?.name ?? '';
			species = details?.species ?? '';
			speciesId = details?.speciesId;
			linkedName = species;
			searching = false;
			returningFromSearch = false;
		});
	});

	function closeSearch() {
		returningFromSearch = true;
		searching = false;
	}

	function pick(match: Species) {
		name = match.name;
		species = match.botanical;
		speciesId = match.id;
		linkedName = match.botanical;
		closeSearch();
	}

	// Typing a different species breaks the link to the database entry.
	$effect(() => {
		if (speciesId !== undefined && species.trim() !== untrack(() => linkedName).trim()) {
			speciesId = undefined;
		}
	});

	async function onsubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!name.trim() || saving) return;
		saving = true;
		try {
			if (flower) {
				await editFlowerDetails(flower.id, { name, species, speciesId });
			} else {
				// Not `oncreated?.(await createFlower(…))`: optional calls skip evaluating their arguments.
				const newId = await createFlower({ name, species, speciesId });
				oncreated?.(newId);
				// Now there's something worth keeping, ask the browser not to evict it.
				pwa.persistStorage();
			}
			open = false;
		} finally {
			saving = false;
		}
	}
</script>

<Sheet bind:open title={searching ? 'Search database' : flower ? 'Edit flower' : 'New flower'}>
	{#if searching}
		<SpeciesSearch initialQuery={name} onselect={pick} oncancel={closeSearch} />
	{:else}
		<form
			{onsubmit}
			in:fly={{
				x: returningFromSearch ? -40 : 0,
				duration: returningFromSearch ? 320 : 0,
				easing: cubicOut
			}}
		>
			<div class="field">
				<label class="field-label" for="{uid}-name">Name</label>
				<div class="name-row">
					<!-- svelte-ignore a11y_autofocus -->
					<input
						id="{uid}-name"
						class="input"
						bind:value={name}
						placeholder="e.g. Backyard rose"
						autocomplete="off"
						enterkeyhint="next"
						autofocus
						required
					/>
					<button
						type="button"
						class="search-btn pressable"
						aria-label="Search database"
						title="Search database"
						onclick={() => (searching = true)}
					>
						<Icon name="search" size={20} strokeWidth={2} />
					</button>
				</div>
			</div>
			<div class="field">
				<label class="field-label" for="{uid}-species">
					Species <span class="optional">· optional</span>
				</label>
				<input
					id="{uid}-species"
					class="input"
					bind:value={species}
					placeholder="e.g. Rosa rubiginosa"
					autocomplete="off"
					enterkeyhint="done"
				/>
				{#if speciesId !== undefined}
					<p class="linked">
						<Icon name="check" size={13} strokeWidth={3} />
						Linked to the flower database
					</p>
				{/if}
			</div>
			<button class="btn btn-primary btn-block submit" disabled={!name.trim() || saving}>
				{flower ? 'Save changes' : 'Add to journal'}
			</button>
		</form>
	{/if}
</Sheet>

<style>
	form {
		display: grid;
		gap: 16px;
	}

	.name-row {
		display: flex;
		gap: 8px;
	}

	.search-btn {
		flex-shrink: 0;
		display: grid;
		place-items: center;
		width: 50px;
		height: 50px;
		border-radius: var(--radius-md);
		color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-primary) 18%, transparent);
	}

	.linked {
		display: flex;
		align-items: center;
		gap: 5px;
		margin: 2px 0 0;
		padding-left: 4px;
		font-size: 12.5px;
		font-weight: 550;
		color: var(--color-primary);
	}

	.optional {
		color: var(--color-text-faint);
	}

	.submit {
		margin-top: 6px;
	}
</style>
