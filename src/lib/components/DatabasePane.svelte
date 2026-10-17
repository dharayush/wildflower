<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { fade, scale, slide } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { cubicOut } from 'svelte/easing';
	import { resolve } from '$app/paths';
	import Icon from './Icon.svelte';
	import SearchField from './SearchField.svelte';
	import ArrangeMenu from './ArrangeMenu.svelte';
	import SpeciesThumb from './SpeciesThumb.svelte';
	import SpeciesFilterSheet, { FILTER_TITLES, type FilterKind } from './SpeciesFilterSheet.svelte';
	import { database } from '#lib/database.svelte.ts';
	import { journal } from '#lib/journal.svelte.ts';
	import { highlight } from '#lib/search.ts';
	import {
		COLOUR_SWATCHES,
		DEFAULT_SPECIES_ORDER,
		MONTH_NAMES,
		SPECIES_ORDERS,
		aliasFor,
		capitalize,
		emptyFilters,
		filterCount,
		letterOf,
		matchesFilters,
		searchSpecies,
		sortSpecies,
		type Colour,
		type Species
	} from '#lib/species.ts';

	let {
		scroller,
		active
	}: {
		/** The pane element that scrolls this list. */
		scroller?: HTMLElement;
		/** Whether the Database tab is the one on screen. */
		active: boolean;
	} = $props();

	const ROW = 76;
	const HEADER = 44;
	const OVERSCAN = 8 * ROW;
	const FILTERS: FilterKind[] = ['habits', 'origins', 'colours', 'months'];

	onMount(() => database.load());

	// ── Results: arrange → filter → search ────────────────────────
	// Species linked to at least one journal entry (kept live with the journal).
	const linkedIds = $derived(
		new Set(journal.flowers?.flatMap((flower) => flower.speciesId ?? []) ?? [])
	);

	const sorted = $derived(database.species && sortSpecies(database.species, database.order));
	const filtered = $derived(
		sorted?.filter(
			(s) => matchesFilters(s, database.filters) && (!database.linkedOnly || linkedIds.has(s.id))
		)
	);

	// Typing is debounced: searching thousands of species on every keystroke can stutter.
	let query = $state(database.query.trim());
	$effect(() => {
		const q = database.query.trim();
		const timer = setTimeout(() => (query = q), q ? 120 : 0);
		return () => clearTimeout(timer);
	});

	const searching = $derived(query.length > 0);
	const results = $derived(filtered && (searching ? searchSpecies(filtered, query) : filtered));
	const total = $derived(database.species?.length ?? 0);
	const activeFilters = $derived(filterCount(database.filters) + (database.linkedOnly ? 1 : 0));
	const byBotanical = $derived(database.order.startsWith('botanical'));

	// ── Layout: rows at fixed heights, with A–Z headers when browsing ─
	type Row =
		| { kind: 'header'; key: string; letter: string; top: number }
		| { kind: 'species'; key: number; species: Species; top: number };

	const layout = $derived.by(() => {
		const rows: Row[] = [];
		const sections: { letter: string; top: number }[] = [];
		let top = 0;
		let letter: string | undefined;
		for (const species of results ?? []) {
			if (!searching) {
				const next = letterOf(species, database.order);
				if (next !== letter) {
					letter = next;
					sections.push({ letter, top });
					rows.push({ kind: 'header', key: `h-${letter}`, letter, top });
					top += HEADER;
				}
			}
			rows.push({ kind: 'species', key: species.id, species, top });
			top += ROW;
		}
		return { rows, sections, height: top };
	});

	// ── Viewport: which rows to draw ─────────────────────────────
	let list = $state<HTMLElement>();
	let pinned = $state<HTMLElement>();
	/** Search and filter bar, pinned under the top bar while the list scrolls. */
	let toolbar = $state<HTMLElement>();
	let toolbarHeight = $state(52);
	let toolbarStuck = $state(false);
	/** The scroller's top edge, in list coordinates. */
	let viewTop = $state(0);
	let viewHeight = $state(900);
	/** Where pinned headers stick, from the scroller's top (below the floating top bar). */
	let stickyTop = 0;

	function measure() {
		if (!scroller) return;
		const scrollerTop = scroller.getBoundingClientRect().top;
		if (toolbar) {
			const line = parseFloat(getComputedStyle(toolbar).top) || 0;
			toolbarStuck = toolbar.getBoundingClientRect().top - scrollerTop <= line + 0.5;
		}
		if (!list) return;
		viewTop = scrollerTop - list.getBoundingClientRect().top;
		viewHeight = scroller.clientHeight;
		if (pinned) stickyTop = parseFloat(getComputedStyle(pinned).top) || 0;
		database.scrollTop = scroller.scrollTop;
	}

	$effect(() => {
		if (!scroller) return;
		const target = scroller;
		target.addEventListener('scroll', measure, { passive: true });
		window.addEventListener('resize', measure);
		return () => {
			target.removeEventListener('scroll', measure);
			window.removeEventListener('resize', measure);
		};
	});

	// Re-measure when anything above the list (search field, chips, recents) changes size.
	$effect(() => {
		void [layout, database.searchOpen, showRecent, list, toolbarHeight];
		tick().then(measure);
	});

	/**
	 * Scrolled down the list when the search or filters change: bring the top of the results
	 * (or the recently viewed strip) up under the pinned toolbar.
	 */
	function showResultsTop() {
		if (!scroller || !toolbar) return;
		const line = parseFloat(getComputedStyle(toolbar).top) || 0;
		const natural =
			toolbarSpacer!.getBoundingClientRect().top -
			scroller.getBoundingClientRect().top +
			scroller.scrollTop;
		const target = Math.max(0, natural - line);
		if (scroller.scrollTop > target) scroller.scrollTop = target;
	}

	let toolbarSpacer = $state<HTMLElement>();
	let resultsKey = '';
	$effect(() => {
		const key = JSON.stringify([query, database.searchOpen, database.filters, database.linkedOnly]);
		if (resultsKey && key !== resultsKey) tick().then(showResultsTop);
		resultsKey = key;
	});

	const rowHeight = (row: Row) => (row.kind === 'header' ? HEADER : ROW);

	const visible = $derived.by(() => {
		const { rows } = layout;
		const from = viewTop - OVERSCAN;
		const to = viewTop + viewHeight + OVERSCAN;
		let lo = 0;
		let hi = rows.length;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (rows[mid].top + rowHeight(rows[mid]) < from) lo = mid + 1;
			else hi = mid;
		}
		const out: Row[] = [];
		for (let i = lo; i < rows.length && rows[i].top < to; i++) out.push(rows[i]);
		return out;
	});

	/** The letter header pinned under the top bar, pushed up by the next one arriving. */
	const pin = $derived.by(() => {
		const { sections } = layout;
		if (searching || !sections.length) return undefined;
		const line = Math.max(0, viewTop + stickyTop);
		// 1px of slack: scroll positions are rounded, and a jump should land on its letter.
		let i = 0;
		while (i + 1 < sections.length && sections[i + 1].top <= line + 1) i++;
		const next = sections[i + 1];
		return {
			letter: sections[i].letter,
			push: next ? Math.min(0, next.top - line - HEADER) : 0,
			// Scrolled into the list: the header is pinned under the top bar.
			stuck: viewTop + stickyTop > 0
		};
	});

	// Coming back from a species: restore where the list was, so the photo morphs home.
	let restored = false;
	$effect(() => {
		if (restored || !scroller || !results) return;
		restored = true;
		const top = database.scrollTop;
		if (top) {
			tick().then(() => {
				scroller.scrollTop = top;
				measure();
			});
		}
	});

	// ── A–Z rail ─────────────────────────────────────────────────
	const railShown = $derived(!searching && layout.sections.length > 1);
	let rail = $state<HTMLElement>();
	let dragLetter = $state<string>();
	let bubbleY = $state(0);

	function jumpTo(letter: string) {
		const section = layout.sections.find((s) => s.letter === letter);
		if (!scroller || !list || !section) return;
		measure();
		const listOffset = scroller.scrollTop - viewTop;
		scroller.scrollTop = Math.ceil(listOffset + section.top - stickyTop);
	}

	function railLetterAt(clientY: number) {
		const rect = rail!.getBoundingClientRect();
		const ratio = Math.min(0.999, Math.max(0, (clientY - rect.top) / rect.height));
		return {
			letter: layout.sections[Math.floor(ratio * layout.sections.length)].letter,
			y: clientY - rect.top
		};
	}

	function onrailpointer(event: PointerEvent) {
		if (event.type === 'pointerdown') {
			(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		} else if (dragLetter === undefined) {
			return;
		}
		event.preventDefault();
		const { letter, y } = railLetterAt(event.clientY);
		bubbleY = y;
		if (letter !== dragLetter) {
			dragLetter = letter;
			jumpTo(letter);
			navigator.vibrate?.(4);
		}
	}

	function onrailend() {
		dragLetter = undefined;
	}

	// ── Recently viewed ──────────────────────────────────────────
	const byId = $derived(database.species && new Map(database.species.map((s) => [s.id, s])));
	const recent = $derived(
		byId ? database.recent.map((id) => byId.get(id)).filter((s) => s !== undefined) : []
	);
	// Shown as suggestions under the search field, until a search is typed.
	const showRecent = $derived(
		database.searchOpen && !database.query.trim() && !activeFilters && recent.length > 0
	);

	// ── Search & filters ─────────────────────────────────────────
	let filterKind = $state<FilterKind>();

	function toggleSearch() {
		database.searchOpen = !database.searchOpen;
		if (!database.searchOpen) database.query = '';
	}

	function clearFilters() {
		database.filters = emptyFilters();
		database.linkedOnly = false;
	}

	function chipLabel(kind: FilterKind): string {
		const values = database.filters[kind] as (string | number)[];
		if (values.length > 1) return `${FILTER_TITLES[kind]} · ${values.length}`;
		if (!values.length) return FILTER_TITLES[kind];
		const [value] = values;
		if (kind === 'months') return MONTH_NAMES[value as number];
		if (value === 'unknown') return 'Colour unknown';
		return capitalize(String(value));
	}

	/** Remembers what was tapped, so its thumbnail morphs into the species page and back. */
	function open(source: 'list' | 'recent', id: number) {
		database.morph = `${source}-${id}`;
		if (scroller) database.scrollTop = scroller.scrollTop;
	}

	const href = (id: number) => resolve('/database/[id]', { id: String(id) });
	const morphName = (source: 'list' | 'recent', id: number) =>
		database.morph === `${source}-${id}` ? `species-${id}` : undefined;
</script>

{#snippet marked(text: string)}
	{#each highlight(text, query) as segment, i (i)}
		{#if segment.match}<mark>{segment.text}</mark>{:else}{segment.text}{/if}
	{/each}
{/snippet}

<div class="top-space" aria-hidden="true"></div>
<div class="pane-header">
	<h1 class="display">Database</h1>
	<p class="subtitle" aria-live="polite">
		{#if !database.species}
			{database.failed ? 'Couldn’t load' : 'Loading…'}
		{:else if searching || activeFilters}
			{results?.length
				? `${results.length.toLocaleString()} of `
				: 'No matches among '}{total.toLocaleString()}
			flowers
		{:else}
			{total.toLocaleString()} flowers
		{/if}
	</p>
</div>

<div class="toolbar-spacer" bind:this={toolbarSpacer} aria-hidden="true"></div>
<div
	class="toolbar"
	class:stuck={toolbarStuck}
	bind:this={toolbar}
	bind:clientHeight={toolbarHeight}
>
	<div class="tool-row">
		<button
			class="icon-btn glass tool"
			class:active={database.searchOpen}
			aria-label={database.searchOpen ? 'Close search' : 'Search the database'}
			aria-expanded={database.searchOpen}
			onclick={toggleSearch}
		>
			{#key database.searchOpen}
				<span class="tool-icon" in:scale={{ start: 0.6, duration: 260, easing: cubicOut }}>
					<Icon name={database.searchOpen ? 'close' : 'search'} size={19} />
				</span>
			{/key}
		</button>

		<div class="chips" role="toolbar" aria-label="Filters">
			<button
				class="chip pressable"
				class:on={database.linkedOnly}
				aria-pressed={database.linkedOnly}
				onclick={() => (database.linkedOnly = !database.linkedOnly)}
			>
				<Icon name="check" size={14} strokeWidth={2.6} />
				Linked
			</button>
			{#each FILTERS as kind (kind)}
				{@const count = database.filters[kind].length}
				{@const colour =
					kind === 'colours' && count === 1 ? database.filters.colours[0] : undefined}
				<button
					class="chip pressable"
					class:on={count > 0}
					aria-haspopup="dialog"
					aria-label="{FILTER_TITLES[kind]} filter{count ? `, ${count} selected` : ''}"
					onclick={() => (filterKind = kind)}
				>
					{#if colour && colour !== 'unknown'}
						<span
							class="swatch"
							style:background={COLOUR_SWATCHES[colour as Colour]}
							aria-hidden="true"
						></span>
					{/if}
					{chipLabel(kind)}
					<Icon name="chevron-down" size={14} strokeWidth={2.4} />
				</button>
			{/each}
			{#if activeFilters}
				<button
					class="chip clear pressable"
					onclick={clearFilters}
					transition:scale={{ start: 0.8, duration: 200 }}
				>
					<Icon name="close" size={13} strokeWidth={2.6} />
					Clear
				</button>
			{/if}
		</div>

		<ArrangeMenu
			options={SPECIES_ORDERS}
			value={database.order}
			defaultValue={DEFAULT_SPECIES_ORDER}
			label="Arrange flowers"
			onchange={(order) => database.setOrder(order)}
		/>
	</div>

	{#if database.searchOpen}
		<div class="search" transition:slide={{ duration: 280, easing: cubicOut }}>
			<SearchField
				bind:value={database.query}
				label="Search the flower database"
				placeholder="Common, botanical, or local name"
			/>
		</div>
	{/if}
</div>

<div class="below-toolbar">
	{#if showRecent}
		<section class="recent" aria-label="Recently viewed" transition:slide={{ duration: 260 }}>
			<div class="recent-header">
				<h2 class="eyebrow">Recently viewed</h2>
				<button class="clear-recent" onclick={() => database.clearRecent()}>Clear</button>
			</div>
			<ul class="recent-list">
				{#each recent as species (species.id)}
					<li animate:flip={{ duration: 300 }}>
						<a
							class="recent-item pressable"
							href={href(species.id)}
							onclick={() => open('recent', species.id)}
						>
							<SpeciesThumb
								src={species.image}
								size={56}
								transitionName={morphName('recent', species.id)}
							/>
							<span>{species.name}</span>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>

{#if !database.species}
	{#if database.failed}
		<div class="state" in:fade>
			<span class="state-icon"><Icon name="database" size={26} /></span>
			<h2>Couldn’t load the database</h2>
			<p>Check your connection, then try again.</p>
			<button class="btn state-btn pressable" onclick={() => database.load()}>Try again</button>
		</div>
	{:else}
		<div class="skeleton" aria-hidden="true">
			{#each { length: 8 }, i (i)}
				<div class="skeleton-row" style:--i={i}>
					<span class="skeleton-thumb"></span>
					<span class="skeleton-lines"><span></span><span></span></span>
				</div>
			{/each}
		</div>
	{/if}
{:else if !results?.length}
	<div class="state" in:fade={{ duration: 200 }}>
		<span class="state-icon"><Icon name="search" size={26} /></span>
		{#if searching}
			<h2>No matches for “{query}”</h2>
			<p>
				Check the spelling, or try a botanical or local name{activeFilters
					? ', or fewer filters'
					: ''}.
			</p>
		{:else if database.linkedOnly && !linkedIds.size}
			<h2>Nothing linked yet</h2>
			<p>Link a journal entry to a flower in the database and it shows up here.</p>
		{:else}
			<h2>No flowers match these filters</h2>
			<p>Try removing one of them.</p>
		{/if}
		<div class="state-actions">
			{#if searching}
				<button class="btn state-btn pressable" onclick={() => (database.query = '')}>
					Clear search
				</button>
			{/if}
			{#if activeFilters}
				<button class="btn state-btn pressable" onclick={clearFilters}>Clear filters</button>
			{/if}
		</div>
	</div>
{:else}
	<div class="list" bind:this={list} style:--toolbar-height="{toolbarHeight}px">
		{#if pin}
			<div
				class="letter pinned"
				class:stuck={pin.stuck}
				bind:this={pinned}
				aria-hidden="true"
				style:transform="translateY({pin.push}px)"
			>
				<span>{pin.letter}</span>
			</div>
		{/if}
		<div class="rows" style:height="{layout.height}px">
			{#each visible as row (row.key)}
				{#if row.kind === 'header'}
					<div class="letter" style:transform="translateY({row.top}px)" role="presentation">
						<span>{row.letter}</span>
					</div>
				{:else}
					{@const s = row.species}
					{@const alias = searching ? aliasFor(s, query) : undefined}
					<a
						class="row"
						href={href(s.id)}
						style:transform="translateY({row.top}px)"
						onclick={() => open('list', s.id)}
					>
						<SpeciesThumb src={s.image} size={56} transitionName={morphName('list', s.id)} />
						<span class="names">
							{#if byBotanical}
								<span class="primary-line">
									<span class="primary botanical">{@render marked(s.botanical)}</span>
									{#if linkedIds.has(s.id)}
										<span class="linked" title="In your journal">
											<Icon name="check" size={11} strokeWidth={3} />Linked
										</span>
									{/if}
								</span>
								<span class="secondary">{@render marked(s.name)}</span>
							{:else}
								<span class="primary-line">
									<span class="primary">{@render marked(s.name)}</span>
									{#if linkedIds.has(s.id)}
										<span class="linked" title="In your journal">
											<Icon name="check" size={11} strokeWidth={3} />Linked
										</span>
									{/if}
								</span>
								<span class="secondary botanical">
									{@render marked(s.botanical)}{#if alias}<span class="alias">
											· {@render marked(alias)}</span
										>{/if}
								</span>
							{/if}
						</span>
					</a>
				{/if}
			{/each}
		</div>
	</div>
{/if}

{#if railShown}
	<!-- Dragging along the rail is a pointer shortcut; each letter is also a focusable button. -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="rail glass"
		style:top="calc(var(--safe-top) + {72 + toolbarHeight + 16}px)"
		class:hidden={!active || !pin?.stuck}
		class:dragging={dragLetter !== undefined}
		bind:this={rail}
		aria-label="Jump to letter"
		onpointerdown={onrailpointer}
		onpointermove={onrailpointer}
		onpointerup={onrailend}
		onpointercancel={onrailend}
	>
		{#each layout.sections as section (section.letter)}
			<button
				class="rail-letter"
				tabindex={active ? 0 : -1}
				aria-label="Jump to {section.letter}"
				onclick={() => jumpTo(section.letter)}
			>
				{section.letter}
			</button>
		{/each}
		{#if dragLetter}
			<span
				class="bubble glass glass-strong"
				style:top="{bubbleY}px"
				transition:scale={{ start: 0.6, duration: 160 }}
			>
				{dragLetter}
			</span>
		{/if}
	</div>
{/if}

<SpeciesFilterSheet
	bind:kind={filterKind}
	filters={database.filters}
	count={results?.length ?? 0}
/>

<style>
	.top-space {
		height: calc(var(--safe-top) + 84px);
	}

	.pane-header {
		margin: 8px 4px 14px;
	}

	h1 {
		margin: 0;
		font-size: 48px;
		letter-spacing: -0.025em;
	}

	.subtitle {
		margin: 6px 0 0;
		font-size: 14px;
		font-weight: 500;
		color: var(--color-text-muted);
		font-variant-numeric: tabular-nums;
	}

	/* Search & filter bar: sticks under the top bar, full-bleed glass once pinned. */
	.toolbar {
		position: sticky;
		top: calc(var(--safe-top) + 72px);
		z-index: 3;
		margin: 0 calc(-1 * var(--gutter));
		padding: 4px var(--gutter) 10px;
		transition:
			background-color 200ms ease,
			box-shadow 200ms ease;
	}

	.toolbar.stuck {
		background: color-mix(in srgb, var(--color-bg) 82%, transparent);
		-webkit-backdrop-filter: blur(16px);
		backdrop-filter: blur(16px);
		box-shadow: 0 1px 0 var(--color-separator);
	}

	/* Continues the frosted panel up behind the top bar, so no rows show between the two. */
	.toolbar.stuck::before {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: 100%;
		height: calc(var(--safe-top) + 72px);
		/* Opaque: a backdrop blur nested in the toolbar's own blur has no effect. */
		background: var(--color-bg);
		pointer-events: none;
	}

	.tool-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.tool-row :global(.icon-btn) {
		flex-shrink: 0;
		width: 40px;
		height: 40px;
		color: var(--color-text);
	}

	.below-toolbar {
		margin: 0 4px;
	}

	.tool {
		transition:
			transform 220ms var(--ease-spring),
			background-color 200ms ease;
	}

	.tool.active {
		background: color-mix(in srgb, var(--color-text) 10%, var(--glass-bg));
	}

	.tool-icon {
		display: grid;
	}

	.search {
		padding-top: 10px;
	}

	/* Filters */

	/* Scrolls sideways between the search and arrange buttons, fading at both edges. */
	.chips {
		flex: 1;
		min-width: 0;
		display: flex;
		gap: 8px;
		padding: 4px 10px;
		overflow-x: auto;
		scrollbar-width: none;
		mask: linear-gradient(90deg, transparent, black 10px, black calc(100% - 10px), transparent);
		-webkit-mask: linear-gradient(
			90deg,
			transparent,
			black 10px,
			black calc(100% - 10px),
			transparent
		);
	}

	.chips::-webkit-scrollbar {
		display: none;
	}

	.chip {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 36px;
		padding: 0 12px 0 14px;
		border-radius: var(--radius-full);
		font-size: 14px;
		font-weight: 550;
		color: var(--color-text);
		background: var(--glass-bg);
		border: 1px solid var(--glass-border);
		box-shadow:
			inset 0 1px 0 var(--glass-highlight),
			var(--shadow-sm);
		transition:
			transform 220ms var(--ease-spring),
			background-color 200ms ease,
			color 200ms ease,
			border-color 200ms ease;
	}

	.chip :global(svg) {
		opacity: 0.6;
	}

	.chip.on {
		color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 13%, var(--glass-bg));
		border-color: color-mix(in srgb, var(--color-primary) 45%, transparent);
	}

	.chip.clear {
		padding: 0 14px 0 12px;
		color: var(--color-text-muted);
	}

	.swatch {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.15);
	}

	/* Recently viewed */

	.recent {
		margin-top: 18px;
	}

	.recent-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}

	.recent-header h2 {
		margin: 0;
	}

	.clear-recent {
		padding: 4px 0 4px 12px;
		font-size: 13px;
		font-weight: 550;
		color: var(--color-primary);
	}

	.recent-list {
		list-style: none;
		display: flex;
		gap: 10px;
		margin: 10px calc(-1 * var(--gutter) - 4px) 0;
		padding: 0 calc(var(--gutter) + 4px) 4px;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.recent-list::-webkit-scrollbar {
		display: none;
	}

	.recent-item {
		display: grid;
		justify-items: center;
		gap: 6px;
		width: 64px;
		color: inherit;
		text-decoration: none;
	}

	.recent-item span:last-child {
		width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		text-align: center;
		font-size: 11.5px;
		font-weight: 500;
		color: var(--color-text-muted);
	}

	/* List */

	.list {
		position: relative;
		margin: 0 -4px;
	}

	.rows {
		position: relative;
		contain: strict;
		width: 100%;
	}

	.row,
	.letter {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 14px;
		height: 76px;
		padding: 0 34px 0 8px;
		border-radius: var(--radius-md);
		color: inherit;
		text-decoration: none;
		transition: background-color 150ms ease;
	}

	.row:active {
		background: color-mix(in srgb, var(--color-text) 6%, transparent);
	}

	/* Hairline between rows, starting under the text. */
	.row::after {
		content: '';
		position: absolute;
		left: 78px;
		right: 34px;
		bottom: 0;
		height: 1px;
		background: var(--color-separator);
	}

	.names {
		min-width: 0;
		display: grid;
		gap: 2px;
	}

	.primary-line {
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
	}

	.linked {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		gap: 3px;
		padding: 2px 7px;
		border-radius: var(--radius-full);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0;
		color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 14%, transparent);
	}

	.primary,
	.secondary {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.primary {
		font-size: 16.5px;
		font-weight: 600;
		letter-spacing: -0.015em;
	}

	.secondary {
		font-size: 14px;
		color: var(--color-text-muted);
	}

	.botanical {
		font-family: var(--font-display);
		font-style: italic;
		font-weight: 400;
	}

	.primary.botanical {
		font-size: 20px;
		letter-spacing: 0;
	}

	.secondary.botanical {
		font-size: 16px;
	}

	.alias {
		font-family: var(--font-sans);
		font-style: normal;
		font-size: 13px;
	}

	mark {
		color: inherit;
		background: color-mix(in srgb, var(--color-primary) 22%, transparent);
		border-radius: 4px;
	}

	.letter {
		display: flex;
		align-items: flex-end;
		height: 44px;
		padding: 0 34px 6px 10px;
	}

	.letter span {
		flex: 1;
		font-family: var(--font-display);
		font-size: 24px;
		line-height: 1;
		color: var(--color-text);
		border-bottom: 1px solid var(--color-separator);
		padding-bottom: 6px;
	}

	/* Stays under the top bar, showing the section being scrolled through. */
	.letter.pinned {
		position: sticky;
		top: calc(var(--safe-top) + 72px + var(--toolbar-height, 0px));
		z-index: 2;
		margin-bottom: -44px;
		pointer-events: none;
		transition: background-color 200ms ease;
	}

	/* Full-bleed and fading out at the bottom, like the top bar's blur. */
	.letter.pinned.stuck {
		margin-inline: calc(-1 * var(--gutter) + 4px);
		padding-inline: calc(var(--gutter) + 6px) calc(var(--gutter) + 30px);
		background: color-mix(in srgb, var(--color-bg) 80%, transparent);
		-webkit-backdrop-filter: blur(16px);
		backdrop-filter: blur(16px);
		mask: linear-gradient(black 80%, transparent);
		-webkit-mask: linear-gradient(black 80%, transparent);
	}

	/* A–Z rail */

	.rail {
		position: fixed;
		right: 4px;
		bottom: calc(var(--safe-bottom) + 24px);
		z-index: 5;
		width: 24px;
		display: flex;
		flex-direction: column;
		justify-content: space-evenly;
		align-items: center;
		max-height: 620px;
		margin: auto 0;
		padding: 6px 0;
		border-radius: var(--radius-full);
		touch-action: none;
		user-select: none;
		box-shadow: none;
		transition:
			opacity 250ms ease,
			background-color 200ms ease;
	}

	.rail.dragging {
		background: var(--glass-bg-strong);
	}

	.rail.hidden {
		opacity: 0;
		pointer-events: none;
	}

	.rail-letter {
		flex: 1;
		width: 100%;
		min-height: 0;
		display: grid;
		place-items: center;
		font-size: 10.5px;
		font-weight: 650;
		color: var(--color-primary);
	}

	.bubble {
		position: absolute;
		right: 40px;
		translate: 0 -50%;
		display: grid;
		place-items: center;
		width: 56px;
		height: 56px;
		border-radius: 50%;
		font-family: var(--font-display);
		font-size: 32px;
		color: var(--color-text);
		pointer-events: none;
	}

	/* States */

	.state {
		display: grid;
		justify-items: center;
		text-align: center;
		padding: 40px 24px;
	}

	.state-icon {
		display: grid;
		place-items: center;
		width: 56px;
		height: 56px;
		margin-bottom: 16px;
		border-radius: 18px;
		color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 12%, transparent);
	}

	.state h2 {
		margin: 0 0 6px;
		max-width: 100%;
		font-size: 20px;
		font-weight: 650;
		letter-spacing: -0.02em;
		overflow-wrap: anywhere;
	}

	.state p {
		margin: 0;
		max-width: 32ch;
		font-size: 14px;
		color: var(--color-text-muted);
	}

	.state-actions {
		display: flex;
		gap: 8px;
	}

	.state-btn {
		margin-top: 18px;
		height: 42px;
		padding: 0 18px;
		font-size: 15px;
		color: var(--color-text);
		background: color-mix(in srgb, var(--color-text) 7%, transparent);
	}

	.skeleton {
		display: grid;
		margin-top: 8px;
	}

	.skeleton-row {
		display: flex;
		align-items: center;
		gap: 14px;
		height: 76px;
		padding: 0 8px;
		animation: pulse 1.4s ease-in-out infinite;
		animation-delay: calc(var(--i) * 80ms);
	}

	.skeleton-thumb {
		width: 56px;
		height: 56px;
		border-radius: 15px;
		background: var(--color-separator);
	}

	.skeleton-lines {
		flex: 1;
		display: grid;
		gap: 8px;
	}

	.skeleton-lines span {
		height: 12px;
		width: 55%;
		border-radius: 6px;
		background: var(--color-separator);
	}

	.skeleton-lines span:last-child {
		width: 38%;
	}

	@keyframes pulse {
		50% {
			opacity: 0.45;
		}
	}
</style>
