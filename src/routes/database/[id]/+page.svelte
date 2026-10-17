<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { liveQuery } from 'dexie';
	import { afterNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from '#lib/components/Icon.svelte';
	import PhotoViewer from '#lib/components/PhotoViewer.svelte';
	import FlowerFormSheet from '#lib/components/FlowerFormSheet.svelte';
	import { database } from '#lib/database.svelte.ts';
	import { journal } from '#lib/journal.svelte.ts';
	import { flowersOfSpecies } from '#lib/flowers.ts';
	import { formatDate } from '#lib/format.ts';
	import {
		COLOUR_SWATCHES,
		capitalize,
		conservationLevel,
		formatFlowering,
		formatMonths
	} from '#lib/species.ts';
	import { art } from '#lib/art.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// The route remounts per species, so capturing the loaded data is intentional.
	// svelte-ignore state_referenced_locally
	const { species, detail } = data;

	onMount(() => database.addRecent(species.id));

	// ── Navigation ──────────────────────────────────────────────
	let cameFromApp = false;
	afterNavigate(({ from }) => {
		cameFromApp = Boolean(from?.route.id);
	});

	function back() {
		if (cameFromApp) {
			history.back();
		} else {
			journal.page = 1; // Land on the Database tab.
			goto(resolve('/journal'), { replaceState: true });
		}
	}

	// ── Gallery ─────────────────────────────────────────────────
	// Without details (offline, not cached yet) the index's primary photo still shows.
	const images = detail?.images ?? (species.image ? [species.image] : []);
	let broken = $state<string[]>([]);
	const photos = $derived(images.filter((src) => !broken.includes(src)));

	let gallery = $state<HTMLElement>();
	let slide = $state(0);
	let viewerIndex = $state<number>();

	function ongalleryscroll() {
		if (gallery) slide = Math.round(gallery.scrollLeft / gallery.clientWidth);
	}

	// ── Journal ─────────────────────────────────────────────────
	const entriesQuery = liveQuery(() => flowersOfSpecies(species.id));
	let formOpen = $state(false);

	function oncreated(id: number) {
		goto(resolve('/journal/[id]', { id: String(id) }));
	}

	// ── Facts ───────────────────────────────────────────────────
	// Everything scraped for the species is shown somewhere on this page.
	type Tone = 'threatened' | 'concern' | 'none';
	const otherNames = species.names.slice(1);
	const languages = Object.entries(detail?.languages ?? {});
	const originLabel = species.origin === 'Native' ? 'Native to India' : species.origin;
	const conservation = detail?.conservation;
	const level: Tone = conservation ? conservationLevel(conservation) : 'none';

	const facts: { label: string; tone?: Tone; icon?: 'butterfly' | 'warning' }[] = [
		originLabel && { label: originLabel },
		species.habit && { label: capitalize(species.habit) },
		detail?.lifeCycle && { label: capitalize(detail.lifeCycle) },
		conservation && level !== 'none' && { label: conservation, tone: level },
		detail?.butterflies && { label: 'Attracts butterflies', icon: 'butterfly' as const },
		detail?.toxic && { label: 'Toxic', icon: 'warning' as const, tone: 'threatened' as const }
	].filter((fact) => !!fact);

	// The site only marks plants that do attract butterflies or are toxic, so an unmarked one
	// is "not recorded", not "no". Flowers whose page couldn't be scraped have no flags at all.
	const flag = (value: boolean | undefined, yes: string) =>
		detail && !detail.fetchFailed ? (value ? yes : 'Not recorded') : undefined;

	const details: { label: string; value?: string; tone?: Tone }[] = [
		{ label: 'Family', value: [species.family, detail?.familyNote].filter(Boolean).join(' · ') },
		{
			label: 'Blooms',
			value: detail?.flowering ? formatFlowering(detail.flowering) : formatMonths(species.months)
		},
		{ label: 'Type', value: species.habit && capitalize(species.habit) },
		{ label: 'Life cycle', value: detail?.lifeCycle && capitalize(detail.lifeCycle) },
		{ label: 'Foliage', value: detail?.foliage && capitalize(detail.foliage) },
		{ label: 'Leaf shape', value: detail?.leafShape && capitalize(detail.leafShape) },
		{ label: 'Origin', value: originLabel },
		{ label: 'Conservation', value: conservation, tone: level },
		{ label: 'Butterflies', value: flag(detail?.butterflies, 'Attracts butterflies') },
		{
			label: 'Toxic',
			value: flag(detail?.toxic, 'Yes'),
			tone: (detail?.toxic ? 'threatened' : 'none') as Tone
		}
	].filter((row) => row.value);
</script>

<svelte:head>
	<title>{species.name} · Wildflower</title>
</svelte:head>

<header class="topbar">
	<button class="icon-btn glass" aria-label="Back" onclick={back}>
		<Icon name="back" strokeWidth={2} />
	</button>
</header>

<main>
	<!-- Gallery ─────────────────────────────────────────────── -->
	<section class="gallery-frame" aria-label="Photos">
		<div class="gallery" bind:this={gallery} onscroll={ongalleryscroll}>
			{#each photos as src, i (src)}
				<button
					class="slide"
					style:view-transition-name={i === 0 ? `species-${species.id}` : undefined}
					aria-label="View photo {i + 1} of {photos.length}"
					onclick={() => (viewerIndex = i)}
				>
					<img
						{src}
						alt="{species.name}, photo {i + 1}"
						draggable="false"
						onerror={() => (broken = [...broken, src])}
					/>
				</button>
			{:else}
				<div class="slide placeholder" style:view-transition-name="species-{species.id}">
					<img src={art.flowerPlaceholder} alt="" draggable="false" />
					<p>{images.length ? 'Photos need a connection' : 'No photos'}</p>
				</div>
			{/each}
		</div>

		{#if photos.length > 1}
			<div class="dots glass" transition:fade={{ duration: 200 }}>
				{#each photos as src, i (src)}
					<span class:active={i === slide}></span>
				{/each}
			</div>
			<span class="count glass" aria-live="polite">{slide + 1} / {photos.length}</span>
		{/if}
	</section>

	<!-- Title ───────────────────────────────────────────────── -->
	<div class="title">
		<h1 class="display">{species.name}</h1>
		<p class="botanical">{species.botanical}</p>
		{#if facts.length}
			<ul class="facts" aria-label="Quick facts">
				{#each facts as fact (fact.label)}
					<li
						class="fact"
						class:threatened={fact.tone === 'threatened'}
						class:concern={fact.tone === 'concern'}
					>
						{#if fact.tone === 'concern'}<span class="dot"></span>{/if}
						{#if fact.icon}<Icon name={fact.icon} size={14} strokeWidth={2.2} />{/if}
						{fact.label}
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<!-- In the journal ──────────────────────────────────────── -->
	{#if $entriesQuery?.length}
		<section class="in-journal glass" aria-label="In your journal" in:fade={{ duration: 200 }}>
			<h2 class="eyebrow">
				<span class="linked-check"><Icon name="check" size={12} strokeWidth={3} /></span>
				Linked in your journal
			</h2>
			{#each $entriesQuery as entry (entry.id)}
				<a class="entry pressable" href={resolve('/journal/[id]', { id: String(entry.id) })}>
					<span class="entry-name">{entry.name}</span>
					<span class="entry-date">Added {formatDate(entry.createdAt)}</span>
					<Icon name="forward" size={18} />
				</a>
			{/each}
		</section>
	{/if}

	{#if !detail}
		<p class="offline glass">
			<Icon name="database" size={18} />
			This flower’s details couldn’t be loaded. Try again after the next app update.
		</p>
	{:else if detail.fetchFailed}
		<p class="offline glass">
			<Icon name="database" size={18} />
			Only part of this flower’s page on flowersofindia.net could be read, so some details are missing.
		</p>
	{/if}

	<!-- About ───────────────────────────────────────────────── -->
	{#if detail?.description}
		<section class="card glass" aria-label="About">
			<h2 class="eyebrow">About</h2>
			<p class="description">{detail.description}</p>
		</section>
	{/if}

	<section class="card glass" aria-label="Details">
		<h2 class="eyebrow">Details</h2>
		<dl>
			<div class="detail-row">
				<dt>Flower colour</dt>
				<dd>
					{#if species.colours.length}
						<span class="colours">
							{#each species.colours as colour (colour)}
								<span class="colour">
									<span class="swatch" style:background={COLOUR_SWATCHES[colour]}></span>
									{capitalize(colour)}
								</span>
							{/each}
						</span>
					{:else}
						<span class="muted">Unknown</span>
					{/if}
				</dd>
			</div>
			{#each details as row (row.label)}
				<div class="detail-row">
					<dt>{row.label}</dt>
					<dd class:threatened={row.tone === 'threatened'} class:concern={row.tone === 'concern'}>
						{row.value}
					</dd>
				</div>
			{/each}
		</dl>
	</section>

	<!-- More (collapsible) ──────────────────────────────────── -->
	{#if otherNames.length || languages.length || species.synonyms.length || detail?.medicinal}
		<div class="more">
			{#if otherNames.length}
				<details class="glass">
					<summary>Also known as <Icon name="chevron-down" size={18} /></summary>
					<p>{otherNames.join(', ')}</p>
				</details>
			{/if}
			{#if languages.length}
				<details class="glass">
					<summary>Names in other languages <Icon name="chevron-down" size={18} /></summary>
					<dl class="languages">
						{#each languages as [language, names] (language)}
							<div>
								<dt>{language}</dt>
								<dd>{names.join(', ')}</dd>
							</div>
						{/each}
					</dl>
				</details>
			{/if}
			{#if species.synonyms.length}
				<details class="glass">
					<summary>Synonyms <Icon name="chevron-down" size={18} /></summary>
					<p class="synonyms">{species.synonyms.join(', ')}</p>
				</details>
			{/if}
			{#if detail?.medicinal}
				<details class="glass">
					<summary>Medicinal uses <Icon name="chevron-down" size={18} /></summary>
					<p>{detail.medicinal}</p>
					<p class="caution">Traditional uses, recorded for interest. Not medical advice.</p>
				</details>
			{/if}
		</div>
	{/if}

	<!-- Credit ──────────────────────────────────────────────── -->
	<footer class="credit">
		{#if detail?.identifiedBy || detail?.photographedIn}
			<p>
				{[
					detail.identifiedBy && `Identified by ${detail.identifiedBy}`,
					detail.photographedIn && `Photographed in ${detail.photographedIn}`
				]
					.filter(Boolean)
					.join(' · ')}
			</p>
		{/if}
		<a href={detail?.source ?? 'https://www.flowersofindia.net/'} target="_blank" rel="noopener">
			Photos and text: flowersofindia.net
			<Icon name="external" size={12} strokeWidth={2.2} />
		</a>
	</footer>
</main>

<div class="add-wrap" in:fly={{ y: 40, duration: 400, delay: 150, easing: cubicOut }}>
	<button class="btn btn-primary add" onclick={() => (formOpen = true)}>
		<Icon name="plus" size={20} strokeWidth={2.2} />
		Add to my journal
	</button>
</div>

{#if viewerIndex !== undefined}
	<PhotoViewer
		photos={photos.map((src) => ({ key: src, src }))}
		start={viewerIndex}
		onclose={() => (viewerIndex = undefined)}
	/>
{/if}

<FlowerFormSheet
	bind:open={formOpen}
	initial={{ name: species.name, species: species.botanical, speciesId: species.id }}
	{oncreated}
/>

<style>
	.topbar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 10;
		display: flex;
		padding: calc(var(--safe-top) + 10px) 16px 0;
		pointer-events: none;
	}

	.topbar .icon-btn {
		width: 44px;
		height: 44px;
		pointer-events: auto;
		color: var(--color-text);
	}

	main {
		max-width: 640px;
		margin: 0 auto;
		padding: calc(var(--safe-top) + 66px) var(--gutter) calc(var(--safe-bottom) + 120px);
		display: grid;
		gap: 16px;
	}

	/* Gallery */

	.gallery-frame {
		position: relative;
	}

	.gallery {
		display: flex;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		scrollbar-width: none;
		border-radius: 32px;
		aspect-ratio: 4 / 5;
		max-height: 62dvh;
		width: 100%;
		background: var(--color-separator);
		box-shadow:
			inset 0 0 0 1px var(--glass-border),
			var(--shadow-lg);
	}

	.gallery::-webkit-scrollbar {
		display: none;
	}

	.slide {
		flex: 0 0 100%;
		height: 100%;
		scroll-snap-align: center;
		overflow: hidden;
		border-radius: 32px;
	}

	.slide img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		user-select: none;
	}

	.placeholder {
		position: relative;
	}

	.placeholder p {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 24px;
		margin: 0;
		text-align: center;
		font-size: 14px;
		font-weight: 550;
		color: rgb(22 24 26 / 0.55);
	}

	.count {
		position: absolute;
		top: 14px;
		right: 14px;
		padding: 4px 10px;
		border-radius: var(--radius-full);
		font-size: 12.5px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--color-text);
	}

	.dots {
		position: absolute;
		bottom: 14px;
		left: 50%;
		translate: -50% 0;
		display: flex;
		gap: 6px;
		padding: 7px 10px;
		border-radius: var(--radius-full);
	}

	.dots span {
		width: 6px;
		height: 6px;
		border-radius: 3px;
		background: var(--color-text);
		opacity: 0.3;
		transition:
			width 350ms var(--ease-spring),
			opacity 250ms ease;
	}

	.dots span.active {
		width: 18px;
		opacity: 0.9;
	}

	/* Title */

	.title {
		padding: 8px 4px 0;
	}

	h1 {
		margin: 0;
		font-size: clamp(40px, 11vw, 56px);
		letter-spacing: -0.025em;
		overflow-wrap: anywhere;
	}

	.botanical {
		margin: 6px 0 0;
		font-family: var(--font-display);
		font-style: italic;
		font-size: 22px;
		color: var(--color-text-muted);
	}

	.facts {
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 14px 0 0;
		padding: 0;
	}

	.fact {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		height: 30px;
		padding: 0 12px;
		border-radius: var(--radius-full);
		font-size: 13px;
		font-weight: 550;
		color: var(--color-text);
		background: color-mix(in srgb, var(--color-text) 6%, transparent);
	}

	.fact.threatened {
		color: var(--color-danger);
		background: color-mix(in srgb, var(--color-danger) 12%, transparent);
	}

	.fact.concern {
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
	}

	.fact .dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--color-accent);
	}

	dd.threatened {
		color: var(--color-danger);
	}

	dd.concern {
		color: var(--color-accent);
	}

	/* Cards */

	.card,
	.in-journal,
	.more details {
		border-radius: var(--radius-lg);
		box-shadow:
			inset 0 1px 0 var(--glass-highlight),
			var(--shadow-sm);
	}

	.card {
		padding: 16px 18px;
	}

	.card h2,
	.in-journal h2 {
		margin: 0 0 8px;
	}

	.description {
		margin: 0;
		font-size: 16px;
		line-height: 1.6;
	}

	dl {
		margin: 0;
	}

	.detail-row {
		display: grid;
		grid-template-columns: 120px 1fr;
		gap: 12px;
		padding: 10px 0;
		border-top: 1px solid var(--color-separator);
	}

	.detail-row:first-child {
		border-top: none;
		padding-top: 4px;
	}

	dt {
		font-size: 14px;
		color: var(--color-text-muted);
	}

	dd {
		margin: 0;
		font-size: 15px;
		font-weight: 500;
	}

	.muted {
		color: var(--color-text-faint);
	}

	.colours {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 12px;
	}

	.colour {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.swatch {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.15);
	}

	/* In the journal */

	/* Tinted green, so a flower already in the journal stands out. */
	.in-journal {
		padding: 14px 8px 8px;
		background: color-mix(in srgb, var(--color-primary) 14%, var(--glass-bg));
		border-color: color-mix(in srgb, var(--color-primary) 40%, transparent);
		box-shadow:
			inset 0 1px 0 var(--glass-highlight),
			0 0 0 1px color-mix(in srgb, var(--color-primary) 18%, transparent),
			var(--shadow-sm);
	}

	.in-journal h2 {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 10px;
		color: var(--color-primary);
	}

	.linked-check {
		display: grid;
		place-items: center;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		color: var(--color-primary-text);
		background: var(--color-primary);
	}

	.in-journal .entry :global(svg) {
		color: var(--color-primary);
	}

	.entry {
		display: grid;
		grid-template-columns: 1fr auto;
		grid-template-rows: auto auto;
		align-items: center;
		column-gap: 8px;
		padding: 8px 10px;
		border-radius: var(--radius-md);
		color: inherit;
		text-decoration: none;
	}

	.entry :global(svg) {
		grid-row: 1 / 3;
		grid-column: 2;
		color: var(--color-text-faint);
	}

	.entry-name {
		font-weight: 600;
	}

	.entry-date {
		font-size: 13px;
		color: var(--color-text-muted);
	}

	.offline {
		display: flex;
		align-items: center;
		gap: 10px;
		margin: 0;
		padding: 14px 16px;
		border-radius: var(--radius-md);
		font-size: 14px;
		color: var(--color-text-muted);
	}

	/* Collapsible sections */

	.more {
		display: grid;
		gap: 10px;
	}

	details {
		padding: 0 18px;
		interpolate-size: allow-keywords;
	}

	details::details-content {
		block-size: 0;
		overflow: hidden;
		transition:
			block-size 320ms var(--ease-out),
			content-visibility 320ms allow-discrete;
	}

	details[open]::details-content {
		block-size: auto;
	}

	summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 54px;
		font-size: 15px;
		font-weight: 600;
		list-style: none;
		cursor: pointer;
	}

	summary::-webkit-details-marker {
		display: none;
	}

	summary :global(svg) {
		color: var(--color-text-faint);
		transition: rotate 300ms var(--ease-out);
	}

	details[open] summary :global(svg) {
		rotate: 180deg;
	}

	details p {
		margin: 0 0 16px;
		font-size: 15px;
		line-height: 1.55;
	}

	.synonyms {
		font-family: var(--font-sans);
		font-style: italic;
		font-size: 17px;
	}

	.caution {
		font-size: 13px;
		color: var(--color-text-faint);
	}

	.languages {
		display: grid;
		gap: 10px;
		padding-bottom: 16px;
	}

	.languages dd {
		font-weight: 400;
	}

	/* Credit */

	.credit {
		display: grid;
		gap: 4px;
		padding: 8px 4px 0;
		font-size: 12px;
		color: var(--color-text-faint);
	}

	.credit p {
		margin: 0;
	}

	.credit a {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		width: fit-content;
		color: inherit;
	}

	/* Add to journal */

	.add-wrap {
		position: fixed;
		left: 0;
		right: 0;
		bottom: calc(var(--safe-bottom) + 24px);
		z-index: 10;
		display: flex;
		justify-content: center;
		pointer-events: none;
	}

	.add {
		height: 54px;
		padding: 0 26px 0 22px;
		pointer-events: auto;
	}
</style>
