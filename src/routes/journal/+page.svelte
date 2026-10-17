<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { flip } from 'svelte/animate';
	import { pushState } from '$app/navigation';
	import { page } from '$app/state';
	import { scale, slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { resolve } from '$app/paths';
	import Icon from '#lib/components/Icon.svelte';
	import PageIndicator from '#lib/components/PageIndicator.svelte';
	import FlowerCard from '#lib/components/FlowerCard.svelte';
	import Sheet from '#lib/components/Sheet.svelte';
	import FlowerFormSheet from '#lib/components/FlowerFormSheet.svelte';
	import SettingsSheet from '#lib/components/SettingsSheet.svelte';
	import SearchField from '#lib/components/SearchField.svelte';
	import ArrangeMenu from '#lib/components/ArrangeMenu.svelte';
	import DatabasePane from '#lib/components/DatabasePane.svelte';
	import { journal } from '#lib/journal.svelte.ts';
	import { deleteFlower, restoreFlower, type FlowerWithCover } from '#lib/flowers.ts';
	import { toasts } from '#lib/toast.svelte.ts';
	import { pluralize } from '#lib/format.ts';
	import { art } from '#lib/art.ts';
	import { DEFAULT_ORDER, SORT_ORDERS, searchFlowers, sortFlowers } from '#lib/search.ts';

	const pages = [{ label: 'Journal' }, { label: 'Database' }] as const;

	let scroller = $state<HTMLElement>();
	let databasePane = $state<HTMLElement>();
	let progress = $state(journal.page);

	let formOpen = $state(false);
	let settingsOpen = $state(false);
	let editing = $state<FlowerWithCover>();
	let selected = $state<FlowerWithCover>();
	let actionsOpen = $state(false);

	// Arranged first, so equally relevant search results keep the chosen order.
	const visible = $derived(
		journal.flowers && searchFlowers(sortFlowers(journal.flowers, journal.order), journal.query)
	);
	const total = $derived(journal.flowers?.length ?? 0);

	function toggleSearch() {
		journal.searchOpen = !journal.searchOpen;
		if (!journal.searchOpen) journal.query = '';
	}

	function clearSearch() {
		journal.query = '';
	}

	const animateIntro = !journal.introPlayed;
	journal.introPlayed = true;

	onMount(() => {
		// Restore the last page without animating.
		scroller!.scrollLeft = journal.page * scroller!.clientWidth;
	});

	let frame = 0;
	let settle: ReturnType<typeof setTimeout>;
	function onscroll() {
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(() => {
			const { scrollLeft, clientWidth } = scroller!;
			progress = clientWidth ? scrollLeft / clientWidth : 0;
			journal.page = Math.round(progress);
		});
		clearTimeout(settle);
		settle = setTimeout(syncHistory, 150);
	}

	// The Database pane gets its own (shallow) history entry, so Back from it slides to
	// Journal instead of leaving the page. Swiping back to Journal pops that entry, so
	// switching panes never piles up history.
	const onDatabaseEntry = () => page.state.pane === 'database';

	function syncHistory() {
		if (journal.page === 1 && !onDatabaseEntry()) pushState('', { pane: 'database' });
		else if (journal.page === 0 && onDatabaseEntry()) history.back();
	}

	let historyReady = false;
	$effect(() => {
		const target = page.state.pane === 'database' ? 1 : 0;
		untrack(() => {
			if (!historyReady) {
				// Arrived with the Database pane remembered: give it its entry.
				historyReady = true;
				syncHistory();
			} else if (journal.page !== target) {
				goTo(target);
			}
		});
	});

	function goTo(index: number) {
		scroller!.scrollTo({ left: index * scroller!.clientWidth, behavior: 'smooth' });
	}

	function openNew() {
		editing = undefined;
		formOpen = true;
	}

	function openActions(flower: FlowerWithCover) {
		selected = flower;
		actionsOpen = true;
	}

	function editSelected() {
		actionsOpen = false;
		editing = selected;
		formOpen = true;
	}

	async function deleteSelected() {
		actionsOpen = false;
		if (!selected) return;
		const deleted = await deleteFlower(selected.id);
		if (!deleted) return;
		toasts.show(`Deleted “${deleted.flower.name}”`, {
			action: { label: 'Undo', run: () => restoreFlower(deleted) }
		});
	}
</script>

<header class="topbar">
	<a class="icon-btn glass" href={resolve('/')} aria-label="Wildflower home">
		<Icon name="flower" />
	</a>
	<PageIndicator {pages} {progress} onselect={goTo} />
	<button class="icon-btn glass" aria-label="Settings" onclick={() => (settingsOpen = true)}>
		<Icon name="settings" />
	</button>
</header>

<div class="pager" bind:this={scroller} {onscroll}>
	<section class="pane" aria-label="Journal">
		<div class="pane-header">
			<div class="title-row">
				<h1 class="display">Journal</h1>
				{#if total}
					<div class="tools">
						<button
							class="icon-btn glass tool"
							class:active={journal.searchOpen}
							aria-label={journal.searchOpen ? 'Close search' : 'Search entries'}
							aria-expanded={journal.searchOpen}
							onclick={toggleSearch}
						>
							{#key journal.searchOpen}
								<span class="tool-icon" in:scale={{ start: 0.6, duration: 260, easing: cubicOut }}>
									<Icon name={journal.searchOpen ? 'close' : 'search'} size={20} />
								</span>
							{/key}
						</button>
						<ArrangeMenu
							options={SORT_ORDERS}
							value={journal.order}
							defaultValue={DEFAULT_ORDER}
							label="Arrange entries"
							onchange={(order) => journal.setOrder(order)}
						/>
					</div>
				{/if}
			</div>
			{#if total}
				<p class="subtitle" aria-live="polite">
					{#if journal.query.trim()}
						{visible?.length
							? `${visible.length} of ${pluralize(total, 'entry', 'entries')}`
							: 'No matching entries'}
					{:else}
						{pluralize(total, 'entry', 'entries')}
					{/if}
				</p>
			{/if}
			{#if journal.searchOpen && total}
				<div class="search" transition:slide={{ duration: 280, easing: cubicOut }}>
					<SearchField
						bind:value={journal.query}
						label="Search journal entries"
						placeholder="Name, species, notes, or month"
					/>
				</div>
			{/if}
		</div>

		{#if visible?.length}
			<ul class="list" class:intro={animateIntro}>
				{#each visible as flower, i (flower.id)}
					<li
						style:--i={i}
						animate:flip={{ duration: 400 }}
						in:scale={{ start: 0.96, duration: 220 }}
						out:scale={{ start: 0.92, duration: 220 }}
					>
						<FlowerCard {flower} query={journal.query} onmore={() => openActions(flower)} />
					</li>
				{/each}
			</ul>
		{:else if total}
			<div class="empty no-results">
				<span class="empty-icon"><Icon name="search" size={26} /></span>
				<h2>No matches for “{journal.query.trim()}”</h2>
				<p>Check the spelling, or try a species, a word from your notes, or a month.</p>
				<button class="btn clear-search pressable" onclick={clearSearch}>Clear search</button>
			</div>
		{:else if journal.flowers}
			<div class="empty">
				<img src={art.emptyJournal} alt="" draggable="false" />
				<h2>Start your journal</h2>
				<p>Add the first flower you want to keep track of.</p>
			</div>
		{/if}
	</section>

	<section class="pane database-pane" aria-label="Database" bind:this={databasePane}>
		<DatabasePane scroller={databasePane} active={progress > 0.5} />
	</section>
</div>

<div
	class="fab-wrap"
	style:opacity={Math.max(0, 1 - progress * 2)}
	style:transform="translateY({progress * 48}px)"
	style:pointer-events={progress > 0.5 ? 'none' : 'auto'}
>
	<a class="btn glass glass-strong fab identify" href={resolve('/identify')}>
		<Icon name="scan" size={20} />
		Identify flower
	</a>
	<button class="btn btn-primary fab" onclick={openNew}>
		<Icon name="plus" size={20} strokeWidth={2.2} />
		New flower
	</button>
</div>

<FlowerFormSheet bind:open={formOpen} flower={editing} />
<SettingsSheet bind:open={settingsOpen} />

<Sheet bind:open={actionsOpen} title={selected?.name}>
	<div class="actions">
		<button class="action pressable" onclick={editSelected}>
			<Icon name="edit" />
			Edit details
		</button>
		<button class="action pressable danger" onclick={deleteSelected}>
			<Icon name="trash" />
			Delete
		</button>
	</div>
</Sheet>

<style>
	.topbar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: calc(var(--safe-top) + 10px) 16px 18px;
	}

	/* Progressive blur under the bar so content scrolls away gracefully. */
	.topbar::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		-webkit-backdrop-filter: blur(16px);
		backdrop-filter: blur(16px);
		background: linear-gradient(var(--color-bg), transparent);
		mask: linear-gradient(black 55%, transparent);
		-webkit-mask: linear-gradient(black 55%, transparent);
		pointer-events: none;
	}

	.topbar .icon-btn {
		width: 44px;
		height: 44px;
		color: var(--color-text);
	}

	.pager {
		position: fixed;
		inset: 0;
		display: flex;
		overflow-x: auto;
		overflow-y: hidden;
		scroll-snap-type: x mandatory;
		overscroll-behavior-x: contain;
		scrollbar-width: none;
	}

	.pager::-webkit-scrollbar {
		display: none;
	}

	.pane {
		flex: 0 0 100%;
		height: 100%;
		overflow-y: auto;
		scroll-snap-align: start;
		scroll-snap-stop: always;
		padding: calc(var(--safe-top) + 84px) var(--gutter) calc(var(--safe-bottom) + 120px);
	}

	.pane-header {
		margin: 8px 4px 20px;
	}

	/* The database pane adds this space itself, so its pinned letter headers measure from the top. */
	.database-pane {
		padding-top: 0;
	}

	.title-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.tools {
		display: flex;
		gap: 8px;
		flex-shrink: 0;
	}

	.tools :global(.icon-btn) {
		color: var(--color-text);
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

	/* Padding (not margin) so the slide transition animates the gap too. */
	.search {
		padding-top: 16px;
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
	}

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 12px;
	}

	.list.intro li {
		animation: card-in 600ms var(--ease-out) both;
		animation-delay: calc(min(var(--i), 8) * 55ms + 80ms);
	}

	@keyframes card-in {
		from {
			opacity: 0;
			transform: translateY(18px) scale(0.98);
		}
	}

	.empty {
		display: grid;
		justify-items: center;
		text-align: center;
		padding: 48px 24px;
		animation: card-in 700ms var(--ease-out) both;
	}

	.empty img {
		width: 180px;
		margin-bottom: 20px;
		opacity: 0.95;
	}

	.empty h2 {
		margin: 0 0 6px;
		font-size: 20px;
		font-weight: 650;
		letter-spacing: -0.02em;
	}

	.empty p {
		margin: 0;
		max-width: 26ch;
		color: var(--color-text-muted);
	}

	.no-results {
		padding-top: 32px;
	}

	.no-results h2 {
		max-width: 100%;
		overflow-wrap: anywhere;
	}

	.no-results p {
		max-width: 32ch;
		font-size: 14px;
	}

	.empty-icon {
		display: grid;
		place-items: center;
		width: 56px;
		height: 56px;
		margin-bottom: 16px;
		border-radius: 18px;
		color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 12%, transparent);
	}

	.clear-search {
		margin-top: 18px;
		height: 42px;
		padding: 0 18px;
		font-size: 15px;
		color: var(--color-text);
		background: color-mix(in srgb, var(--color-text) 7%, transparent);
	}

	.fab-wrap {
		position: fixed;
		left: 0;
		right: 0;
		bottom: calc(var(--safe-bottom) + 24px);
		display: flex;
		justify-content: center;
		gap: 10px;
		padding: 0 var(--gutter);
		z-index: 10;
		will-change: transform, opacity;
	}

	.fab {
		height: 54px;
		padding: 0 22px 0 18px;
		white-space: nowrap;
	}

	.fab.identify {
		color: var(--color-text);
		text-decoration: none;
		box-shadow:
			inset 0 1px 0 var(--glass-highlight),
			var(--shadow-md);
	}

	.actions {
		display: grid;
		gap: 8px;
	}

	.action {
		display: flex;
		align-items: center;
		gap: 14px;
		height: 56px;
		padding: 0 18px;
		border-radius: var(--radius-md);
		font-size: 16px;
		font-weight: 550;
		background: color-mix(in srgb, var(--color-text) 5%, transparent);
	}

	.action.danger {
		color: var(--color-danger);
	}
</style>
