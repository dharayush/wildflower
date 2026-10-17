<script lang="ts" module>
	export type FilterKind = 'habits' | 'origins' | 'colours' | 'months';

	export const FILTER_TITLES: Record<FilterKind, string> = {
		habits: 'Type',
		origins: 'Origin',
		colours: 'Colour',
		months: 'Blooms'
	};
</script>

<script lang="ts">
	import Sheet from './Sheet.svelte';
	import Icon from './Icon.svelte';
	import {
		COLOURS,
		COLOUR_SWATCHES,
		HABITS,
		MONTH_NAMES,
		ORIGINS,
		capitalize,
		type SpeciesFilters
	} from '#lib/species.ts';

	let {
		kind = $bindable(),
		filters,
		count
	}: {
		/** The filter being edited; the sheet is open while set. */
		kind?: FilterKind;
		filters: SpeciesFilters;
		/** How many species match with the current filters. */
		count: number;
	} = $props();

	let open = $state(false);
	let shown = $state<FilterKind>('habits');

	$effect(() => {
		if (kind) {
			shown = kind;
			open = true;
		}
	});

	$effect(() => {
		if (!open) kind = undefined;
	});

	const options = $derived.by((): { value: string | number; label: string; swatch?: string }[] => {
		switch (shown) {
			case 'habits':
				return HABITS.map((value) => ({ value, label: capitalize(value) }));
			case 'origins':
				return ORIGINS.map((value) => ({ value, label: value }));
			case 'colours':
				return [
					...COLOURS.map((value) => ({
						value,
						label: capitalize(value),
						swatch: COLOUR_SWATCHES[value]
					})),
					{ value: 'unknown', label: 'Unknown' }
				];
			case 'months':
				return MONTH_NAMES.map((name, value) => ({ value, label: name.slice(0, 3) }));
		}
	});

	const selected = $derived(filters[shown] as (string | number)[]);

	function toggle(value: string | number) {
		const list = filters[shown] as (string | number)[];
		const at = list.indexOf(value);
		if (at === -1) list.push(value);
		else list.splice(at, 1);
	}

	const hints: Record<FilterKind, string> = {
		habits: 'Pick any number of plant types.',
		origins: 'Native to India, introduced, or naturalized (introduced and now growing wild).',
		colours: 'Read from each flower’s description, so it’s approximate.',
		months: 'Only flowers with a known flowering season are shown.'
	};
</script>

<Sheet bind:open title={FILTER_TITLES[shown]}>
	<p class="hint">{hints[shown]}</p>
	<div class="options" class:months={shown === 'months'}>
		{#each options as option (option.value)}
			{@const on = selected.includes(option.value)}
			<button
				class="option pressable"
				class:on
				aria-pressed={on}
				onclick={() => toggle(option.value)}
			>
				{#if shown === 'colours'}
					<span
						class="swatch"
						class:unknown={!option.swatch}
						style:background={option.swatch}
						aria-hidden="true"
					></span>
				{/if}
				{option.label}
				{#if on && shown !== 'months'}<Icon name="check" size={15} strokeWidth={2.6} />{/if}
			</button>
		{/each}
	</div>
	<div class="footer">
		<button
			class="btn clear"
			disabled={!selected.length}
			onclick={() => (filters[shown].length = 0)}
		>
			Clear
		</button>
		<button class="btn btn-primary done" onclick={() => (open = false)}>
			{count
				? `Show ${count.toLocaleString()} ${count === 1 ? 'flower' : 'flowers'}`
				: 'No matches'}
		</button>
	</div>
</Sheet>

<style>
	.hint {
		margin: 0 4px 14px;
		text-align: center;
		font-size: 13.5px;
		color: var(--color-text-muted);
	}

	.options {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 8px;
	}

	.options.months {
		grid-template-columns: repeat(4, 1fr);
	}

	.option {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		height: 46px;
		padding: 0 12px;
		border-radius: var(--radius-sm);
		font-size: 15px;
		font-weight: 550;
		color: var(--color-text);
		background: color-mix(in srgb, var(--color-text) 5%, transparent);
		box-shadow: inset 0 0 0 1px transparent;
		transition:
			transform 220ms var(--ease-spring),
			background-color 200ms ease,
			box-shadow 200ms ease,
			color 200ms ease;
	}

	.option.on {
		color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 13%, transparent);
		box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--color-primary) 55%, transparent);
	}

	.swatch {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
		border-radius: 50%;
		box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.14);
	}

	.swatch.unknown {
		background: conic-gradient(#ef84a8, #f3c63f, #6db66c, #4f86df, #9a6bd1, #ef84a8);
		opacity: 0.45;
	}

	.footer {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 10px;
		margin-top: 18px;
	}

	.clear {
		padding: 0 20px;
		color: var(--color-text);
		background: color-mix(in srgb, var(--color-text) 6%, transparent);
	}
</style>
