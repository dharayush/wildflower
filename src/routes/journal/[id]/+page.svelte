<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import { liveQuery } from 'dexie';
	import { afterNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from '#lib/components/Icon.svelte';
	import Sheet from '#lib/components/Sheet.svelte';
	import FlowerFormSheet from '#lib/components/FlowerFormSheet.svelte';
	import PhotoViewer from '#lib/components/PhotoViewer.svelte';
	import SpeciesSearch from '#lib/components/SpeciesSearch.svelte';
	import SpeciesThumb from '#lib/components/SpeciesThumb.svelte';
	import { db, type Photo } from '#lib/db.ts';
	import { deleteFlower, linkFlower, restoreFlower, updateFlower } from '#lib/flowers.ts';
	import { getSpecies } from '#lib/database.svelte.ts';
	import type { Species } from '#lib/species.ts';
	import { addPhotos, deletePhoto, listPhotos, photoUrl } from '#lib/photos.ts';
	import { toasts } from '#lib/toast.svelte.ts';
	import { saveToGallery } from '#lib/gallery.ts';
	import { formatDate } from '#lib/format.ts';
	import { art } from '#lib/art.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// The route remounts per entry, so capturing the initial id is intentional.
	// svelte-ignore state_referenced_locally
	const id = data.flower.id;
	const flowerQuery = liveQuery(() => db.flowers.get(id));
	const photosQuery = liveQuery(() => listPhotos(id));
	const flower = $derived($flowerQuery ?? data.flower);
	const photos = $derived($photosQuery ?? data.photos);

	// ── Navigation ──────────────────────────────────────────────
	let cameFromJournal = false;
	afterNavigate(({ from }) => {
		cameFromJournal = from?.route.id === '/journal';
	});

	function back() {
		if (cameFromJournal) history.back();
		else goto(resolve('/journal'), { replaceState: true });
	}

	// ── Gallery ─────────────────────────────────────────────────
	let gallery = $state<HTMLElement>();
	let slide = $state(0);
	let viewerIndex = $state<number>();
	let adding = $state(false);
	let cameraInput = $state<HTMLInputElement>();
	let uploadInput = $state<HTMLInputElement>();

	function ongalleryscroll() {
		if (!gallery) return;
		slide = Math.round(gallery.scrollLeft / gallery.clientWidth);
	}

	/** Adds the input's files to the entry; resolves to the files added (none on failure). */
	async function addFrom(input: HTMLInputElement): Promise<File[]> {
		const files = [...(input.files ?? [])];
		input.value = '';
		if (!files.length) return [];
		adding = true;
		const target = photos.length;
		try {
			await addPhotos(id, files);
			// Wait for the live query to render the new slides, then reveal the first new one.
			await new Promise((r) => setTimeout(r, 60));
			await tick();
			gallery?.scrollTo({ left: target * gallery.clientWidth, behavior: 'smooth' });
			return files;
		} catch (error) {
			console.error(error);
			toasts.show('Couldn’t add that photo');
			return [];
		} finally {
			adding = false;
		}
	}

	function onupload(event: Event) {
		addFrom(event.currentTarget as HTMLInputElement);
	}

	// Camera shots exist only inside Wildflower, so offer to keep the full-quality
	// original in the phone's gallery too (Wildflower itself stores a resized copy).
	async function oncamera(event: Event) {
		const [original] = await addFrom(event.currentTarget as HTMLInputElement);
		if (!original) return;
		toasts.show('Photo added', {
			duration: 8000,
			action: {
				label: 'Save to gallery',
				run: () =>
					saveToGallery(original, flower.name).catch((error) => {
						console.error(error);
						toasts.show('Couldn’t save to gallery');
					})
			}
		});
	}

	async function removePhoto(photo: Photo) {
		await deletePhoto(photo.id);
		toasts.show('Photo deleted', {
			action: { label: 'Undo', run: () => db.photos.put(photo) }
		});
	}

	// ── Notes (autosaved) ───────────────────────────────────────
	// svelte-ignore state_referenced_locally
	let notes = $state(data.flower.notes);
	let saveState = $state<'idle' | 'saving' | 'saved'>('idle');
	let saveTimer: ReturnType<typeof setTimeout> | undefined;

	function oninput() {
		saveState = 'saving';
		clearTimeout(saveTimer);
		saveTimer = setTimeout(saveNotes, 600);
	}

	async function saveNotes() {
		clearTimeout(saveTimer);
		saveTimer = undefined;
		await updateFlower(id, { notes });
		saveState = 'saved';
	}

	onDestroy(() => {
		if (saveTimer) saveNotes();
	});

	// ── Link to the flower database ─────────────────────────────
	let linkOpen = $state(false);
	let linkedSpecies = $state<Species>();

	$effect(() => {
		const speciesId = flower.speciesId;
		if (speciesId === undefined) {
			linkedSpecies = undefined;
			return;
		}
		getSpecies(speciesId).then(
			(species) => {
				if (flower.speciesId === speciesId) linkedSpecies = species;
			},
			() => (linkedSpecies = undefined)
		);
	});

	async function link(species: Species) {
		linkOpen = false;
		await linkFlower(id, species);
	}

	async function unlink() {
		const previous = linkedSpecies;
		await linkFlower(id, undefined);
		if (previous) {
			toasts.show('Unlinked from the database', {
				action: { label: 'Undo', run: () => linkFlower(id, previous) }
			});
		}
	}

	// ── Menu ────────────────────────────────────────────────────
	let menuOpen = $state(false);
	let editOpen = $state(false);

	async function remove() {
		menuOpen = false;
		if (saveTimer) await saveNotes();
		const deleted = await deleteFlower(id);
		if (!deleted) return;
		back();
		toasts.show(`Deleted “${deleted.flower.name}”`, {
			action: { label: 'Undo', run: () => restoreFlower(deleted) }
		});
	}
</script>

<svelte:head>
	<title>{flower.name} · Wildflower</title>
</svelte:head>

<header class="topbar">
	<button class="icon-btn glass" aria-label="Back to journal" onclick={back}>
		<Icon name="back" strokeWidth={2} />
	</button>
	<button class="icon-btn glass" aria-label="More options" onclick={() => (menuOpen = true)}>
		<Icon name="more" />
	</button>
</header>

<main>
	<!-- Gallery ─────────────────────────────────────────────── -->
	<section class="gallery-frame" aria-label="Photos">
		<div class="gallery" bind:this={gallery} onscroll={ongalleryscroll}>
			{#each photos as photo, i (photo.id)}
				<button
					class="slide"
					style:view-transition-name={i === 0 ? `flower-${id}` : undefined}
					aria-label="View photo {i + 1} of {photos.length}"
					onclick={() => (viewerIndex = i)}
					in:scale={{ start: 0.9, duration: 400, easing: backOut }}
				>
					<img src={photoUrl(photo)} alt="" draggable="false" />
				</button>
			{:else}
				<div class="slide placeholder" style:view-transition-name="flower-{id}">
					<img src={art.flowerPlaceholder} alt="" draggable="false" />
					<p>No photos yet</p>
				</div>
			{/each}
		</div>

		{#if photos.length > 1}
			<div class="dots glass" transition:fade={{ duration: 200 }}>
				{#each photos as photo, i (photo.id)}
					<span class:active={i === slide}></span>
				{/each}
			</div>
		{/if}
	</section>

	<div class="photo-actions">
		<button class="btn glass" disabled={adding} onclick={() => cameraInput?.click()}>
			<Icon name="camera" size={20} />
			Take photo
		</button>
		<button class="btn glass" disabled={adding} onclick={() => uploadInput?.click()}>
			<Icon name="image" size={20} />
			Upload
		</button>
		<input
			bind:this={cameraInput}
			type="file"
			accept="image/*"
			capture="environment"
			hidden
			onchange={oncamera}
		/>
		<input
			bind:this={uploadInput}
			type="file"
			accept="image/*"
			multiple
			hidden
			onchange={onupload}
		/>
	</div>

	<!-- Title ───────────────────────────────────────────────── -->
	<div class="title">
		<h1 class="display">{flower.name}</h1>
		{#if flower.species}<p class="species">{flower.species}</p>{/if}
		<p class="meta">Added {formatDate(flower.createdAt)}</p>
	</div>

	<!-- Notes ───────────────────────────────────────────────── -->
	<section class="notes glass">
		<div class="notes-header">
			<h2 class="eyebrow">Notes</h2>
			{#if saveState !== 'idle'}
				<span class="save-state" transition:fade={{ duration: 150 }}>
					{saveState === 'saving' ? 'Saving…' : 'Saved'}
				</span>
			{/if}
		</div>
		<textarea
			bind:value={notes}
			{oninput}
			onblur={() => saveTimer && saveNotes()}
			placeholder="Where you found it, colors, scent, bloom time…"
			aria-label="Notes"></textarea>
	</section>

	<!-- Link to the flower database ───────────────────────── -->
	{#if flower.speciesId !== undefined}
		<section class="linked-card glass" aria-label="In the flower database">
			<a
				class="linked-main pressable"
				href={resolve('/database/[id]', { id: String(flower.speciesId) })}
			>
				<SpeciesThumb src={linkedSpecies?.image} size={52} />
				<span class="linked-text">
					<span class="eyebrow">In the database</span>
					<span class="linked-name">{linkedSpecies?.name ?? 'Linked flower'}</span>
					{#if linkedSpecies}<span class="linked-botanical">{linkedSpecies.botanical}</span>{/if}
				</span>
				<Icon name="forward" size={20} />
			</a>
			<button class="unlink" onclick={unlink}>Unlink</button>
		</section>
	{:else}
		<div class="link">
			<button class="btn btn-block glass link-btn" onclick={() => (linkOpen = true)}>
				<Icon name="link" size={20} strokeWidth={2} />
				Link to the flower database
			</button>
			<p class="link-caption">Match this entry with a flower in the database to see its details.</p>
		</div>
	{/if}
</main>

{#if viewerIndex !== undefined}
	<PhotoViewer
		photos={photos.map((photo) => ({ key: photo.id, src: photoUrl(photo) }))}
		start={viewerIndex}
		onclose={() => (viewerIndex = undefined)}
		ondelete={(index) => removePhoto(photos[index])}
	/>
{/if}

<Sheet bind:open={menuOpen} title={flower.name}>
	<div class="menu">
		<button
			class="menu-item pressable"
			onclick={() => {
				menuOpen = false;
				editOpen = true;
			}}
		>
			<Icon name="edit" />
			Edit details
		</button>
		<button class="menu-item pressable danger" onclick={remove}>
			<Icon name="trash" />
			Delete flower
		</button>
	</div>
</Sheet>

<FlowerFormSheet bind:open={editOpen} {flower} />

<Sheet bind:open={linkOpen} title="Link to database">
	{#if linkOpen}
		<SpeciesSearch
			initialQuery={flower.species || flower.name}
			backLabel="Close"
			onselect={link}
			oncancel={() => (linkOpen = false)}
		/>
	{/if}
</Sheet>

<style>
	.topbar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 10;
		display: flex;
		justify-content: space-between;
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
		padding: calc(var(--safe-top) + 66px) var(--gutter) calc(var(--safe-bottom) + 40px);
		display: grid;
		gap: 20px;
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

	.photo-actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}

	.photo-actions .btn {
		height: 50px;
		font-size: 15px;
		box-shadow:
			inset 0 1px 0 var(--glass-highlight),
			var(--shadow-sm);
	}

	/* Title */

	.title {
		padding: 4px 4px 0;
	}

	h1 {
		margin: 0;
		font-size: clamp(40px, 11vw, 56px);
		letter-spacing: -0.025em;
		overflow-wrap: anywhere;
	}

	.species {
		margin: 6px 0 0;
		font-family: var(--font-display);
		font-style: italic;
		font-size: 22px;
		color: var(--color-text-muted);
	}

	.meta {
		margin: 10px 0 0;
		font-size: 13px;
		color: var(--color-text-faint);
	}

	/* Notes */

	.notes {
		border-radius: var(--radius-lg);
		padding: 16px 18px 8px;
		box-shadow:
			inset 0 1px 0 var(--glass-highlight),
			var(--shadow-sm);
	}

	.notes-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.notes h2 {
		margin: 0;
	}

	.save-state {
		font-size: 12px;
		color: var(--color-text-faint);
	}

	textarea {
		display: block;
		width: 100%;
		min-height: 180px;
		field-sizing: content;
		margin-top: 8px;
		padding: 0;
		border: none;
		background: none;
		resize: none;
		font-size: 17px;
		line-height: 1.6;
		outline: none;
	}

	textarea::placeholder {
		color: var(--color-text-faint);
	}

	/* Link */

	.link {
		display: grid;
		gap: 10px;
		margin-top: 8px;
	}

	.link-btn {
		height: 56px;
		box-shadow:
			inset 0 1px 0 var(--glass-highlight),
			var(--shadow-sm);
	}

	.link-caption {
		margin: 0;
		text-align: center;
		font-size: 13px;
		color: var(--color-text-faint);
	}

	.linked-card {
		margin-top: 8px;
		padding: 8px;
		border-radius: var(--radius-lg);
		box-shadow:
			inset 0 1px 0 var(--glass-highlight),
			var(--shadow-sm);
	}

	.linked-main {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 6px 10px 6px 6px;
		border-radius: calc(var(--radius-lg) - 8px);
		color: inherit;
		text-decoration: none;
	}

	.linked-main :global(svg) {
		margin-left: auto;
		flex-shrink: 0;
		color: var(--color-text-faint);
	}

	.linked-text {
		min-width: 0;
		display: grid;
		gap: 1px;
	}

	.linked-text .eyebrow {
		color: var(--color-primary);
		font-size: 11px;
	}

	.linked-name,
	.linked-botanical {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.linked-name {
		font-size: 17px;
		font-weight: 600;
		letter-spacing: -0.015em;
	}

	.linked-botanical {
		font-family: var(--font-display);
		font-style: italic;
		font-size: 16px;
		color: var(--color-text-muted);
	}

	.unlink {
		display: block;
		margin: 2px auto 0;
		padding: 8px 14px;
		font-size: 13px;
		font-weight: 550;
		color: var(--color-text-muted);
	}

	/* Menu */

	.menu {
		display: grid;
		gap: 8px;
	}

	.menu-item {
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

	.menu-item.danger {
		color: var(--color-danger);
	}
</style>
