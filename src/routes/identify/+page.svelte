<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { fade, fly, scale, slide } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { cubicOut } from 'svelte/easing';
	import { afterNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from '#lib/components/Icon.svelte';
	import Sheet from '#lib/components/Sheet.svelte';
	import FlowerFormSheet from '#lib/components/FlowerFormSheet.svelte';
	import PlantNetKeyForm from '#lib/components/PlantNetKeyForm.svelte';
	import SpeciesThumb from '#lib/components/SpeciesThumb.svelte';
	import { plantnet } from '#lib/plantnet.svelte.ts';
	import {
		identify,
		MAX_PHOTOS,
		ORGANS,
		ORGAN_LABELS,
		PlantNetError,
		type Candidate,
		type Organ
	} from '#lib/plantnet.ts';
	import { addPhotos, forIdentification } from '#lib/photos.ts';
	import { matchNames } from '#lib/database.svelte.ts';
	import { saveToGallery } from '#lib/gallery.ts';
	import { toasts } from '#lib/toast.svelte.ts';
	import { journal } from '#lib/journal.svelte.ts';
	import { capitalize, type NameMatch } from '#lib/species.ts';
	import type { FlowerDetails } from '#lib/flowers.ts';

	// ── Navigation ──────────────────────────────────────────────
	let cameFromApp = false;
	afterNavigate(({ from }) => {
		cameFromApp = Boolean(from?.route.id);
	});

	function back() {
		if (cameFromApp) {
			history.back();
		} else {
			journal.page = 0;
			goto(resolve('/journal'), { replaceState: true });
		}
	}

	// ── Photos ──────────────────────────────────────────────────
	interface Shot {
		id: number;
		file: File;
		/** Preview; these are transient, unsaved files, so the URL is managed here. */
		url: string;
		organ: Organ;
	}

	let shots = $state<Shot[]>([]);
	let nextShotId = 0;
	let cameraInput = $state<HTMLInputElement>();
	let uploadInput = $state<HTMLInputElement>();
	const room = $derived(MAX_PHOTOS - shots.length);

	function take(input: HTMLInputElement): File[] {
		const files = [...(input.files ?? [])];
		input.value = '';
		if (files.length > room) toasts.show(`Up to ${MAX_PHOTOS} photos per identification`);
		const accepted = files.slice(0, room);
		shots.push(
			...accepted.map((file) => ({
				id: nextShotId++,
				file,
				url: URL.createObjectURL(file),
				organ: 'auto' as Organ
			}))
		);
		if (accepted.length) clearResults();
		return accepted;
	}

	// Camera shots exist only inside Wildflower, so offer to keep the original in the gallery.
	function oncamera(event: Event) {
		const [photo] = take(event.currentTarget as HTMLInputElement);
		if (!photo) return;
		toasts.show('Photo added', {
			duration: 8000,
			action: {
				label: 'Save to gallery',
				run: () =>
					saveToGallery(photo, 'flower').catch((error) => {
						console.error(error);
						toasts.show('Couldn’t save to gallery');
					})
			}
		});
	}

	function remove(shot: Shot) {
		URL.revokeObjectURL(shot.url);
		shots = shots.filter((other) => other.id !== shot.id);
		clearResults();
	}

	function cycleOrgan(shot: Shot) {
		shot.organ = ORGANS[(ORGANS.indexOf(shot.organ) + 1) % ORGANS.length];
		clearResults();
	}

	// ── Identification ──────────────────────────────────────────
	interface Result {
		candidate: Candidate;
		match?: NameMatch;
	}

	interface Problem {
		title: string;
		detail: string;
		/** Offer to fix the key, or to save the photos without identifying. */
		action?: 'key' | 'save';
	}

	let results = $state<Result[]>();
	let problem = $state<Problem>();
	let identifying = $state(false);
	let noticeOpen = $state(false);
	let controller: AbortController | undefined;
	let resultsSection = $state<HTMLElement>();

	function clearResults() {
		controller?.abort();
		identifying = false;
		results = undefined;
		problem = undefined;
	}

	function start() {
		if (!shots.length || !plantnet.key || identifying) return;
		if (!plantnet.noticeSeen) {
			noticeOpen = true;
			return;
		}
		run();
	}

	function acceptNotice() {
		plantnet.acknowledgeNotice();
		noticeOpen = false;
		run();
	}

	async function run() {
		const key = plantnet.key;
		if (!key) return;
		identifying = true;
		results = undefined;
		problem = undefined;
		controller = new AbortController();
		const { signal } = controller;
		try {
			const photos = await Promise.all(
				shots.map(async (shot) => ({
					image: await forIdentification(shot.file),
					organ: shot.organ
				}))
			);
			const { candidates, remaining } = await identify(key, photos, signal);
			if (remaining !== undefined) plantnet.remaining = remaining;
			if (!candidates.length) throw new PlantNetError('none', 'No candidates');
			const matches = await matchNames(candidates.map((c) => c.scientificName)).catch(() => []);
			results = candidates.map((candidate, i) => ({ candidate, match: matches[i] }));
			await tick();
			resultsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		} catch (failure) {
			if (signal.aborted) return;
			console.error(failure);
			problem = describe(failure);
		} finally {
			if (!signal.aborted) identifying = false;
		}
	}

	function describe(failure: unknown): Problem {
		const kind = failure instanceof PlantNetError ? failure.kind : 'other';
		switch (kind) {
			case 'key':
				return {
					title: 'Pl@ntNet didn’t accept your API key',
					detail: 'It may have been changed or deleted. Connect it again to continue.',
					action: 'key'
				};
			case 'quota':
				return {
					title: 'Today’s identifications are used up',
					detail: 'Your free key allows 500 a day. Try again tomorrow, or save these photos now.',
					action: 'save'
				};
			case 'none':
				return {
					title: 'No plant recognised',
					detail:
						'Try a closer, sharper photo of the flower, or add photos of its leaves, fruit, or bark.'
				};
			case 'network':
				return navigator.onLine
					? {
							title: 'Couldn’t reach Pl@ntNet',
							detail: `Check your connection. If it keeps happening, make sure ${location.origin} is an authorized domain for your API key.`,
							action: 'save'
						}
					: {
							title: 'You’re offline',
							detail:
								'Identifying needs an internet connection. You can still save these photos as a new flower.',
							action: 'save'
						};
			default:
				return {
					title: 'Something went wrong',
					detail: 'Pl@ntNet couldn’t identify these photos. Try again in a moment.',
					action: 'save'
				};
		}
	}

	function fixKey() {
		plantnet.disconnect();
		problem = undefined;
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function startOver() {
		clearResults();
		for (const shot of shots) URL.revokeObjectURL(shot.url);
		shots = [];
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	onDestroy(() => {
		controller?.abort();
		for (const shot of shots) URL.revokeObjectURL(shot.url);
	});

	// ── Saving ──────────────────────────────────────────────────
	let formOpen = $state(false);
	let formInitial = $state<FlowerDetails>();

	/** Opens the new-flower form, prefilled from a result (linked if it's in the database). */
	function addToJournal(result?: Result) {
		const { candidate, match } = result ?? {};
		formInitial = match
			? { name: match.species.name, species: match.species.botanical, speciesId: match.species.id }
			: candidate
				? {
						name: capitalize(candidate.commonNames[0] ?? candidate.scientificName),
						species: candidate.scientificName
					}
				: undefined;
		formOpen = true;
	}

	async function oncreated(id: number) {
		try {
			await addPhotos(
				id,
				shots.map((shot) => shot.file)
			);
		} catch (error) {
			console.error(error);
			toasts.show('Saved, but the photos couldn’t be added');
		}
		// Replace this page, so Back from the new entry returns to the journal.
		goto(resolve('/journal/[id]', { id: String(id) }), { replaceState: true });
	}

	const percent = (score: number) => Math.max(1, Math.round(score * 100));
</script>

<svelte:head>
	<title>Identify a flower · Wildflower</title>
</svelte:head>

<header class="topbar">
	<button class="icon-btn glass" aria-label="Back" onclick={back}>
		<Icon name="back" strokeWidth={2} />
	</button>
</header>

<main>
	<div class="intro">
		<h1 class="display">Identify</h1>
		<p class="lede">Photograph a flower, and Pl@ntNet will suggest what it is.</p>
	</div>

	{#if !plantnet.key}
		<section class="card glass" aria-label="Connect Pl@ntNet" transition:slide={{ duration: 280 }}>
			<h2 class="eyebrow">Connect Pl@ntNet</h2>
			<p class="card-text">
				Identification uses your own Pl@ntNet API key. Paste it once and it’s remembered on this
				device.
			</p>
			<PlantNetKeyForm />
		</section>
	{/if}

	<!-- Photos ──────────────────────────────────────────────── -->
	<section class="photos" aria-label="Photos">
		{#if !shots.length}
			<button class="capture glass pressable" onclick={() => cameraInput?.click()} in:fade>
				<span class="capture-icon"><Icon name="camera" size={30} /></span>
				<span class="capture-title">Take a photo</span>
				<span class="capture-detail">Get close to the flower, in good light</span>
			</button>
			<button class="btn glass btn-block choose" onclick={() => uploadInput?.click()}>
				<Icon name="image" size={20} />
				Choose from photos
			</button>
		{:else}
			<ul class="tiles" class:identifying>
				{#each shots as shot (shot.id)}
					<li
						class="tile"
						animate:flip={{ duration: 280 }}
						in:scale={{ start: 0.85, duration: 260, easing: cubicOut }}
						out:scale={{ start: 0.85, duration: 180 }}
					>
						<img src={shot.url} alt="" draggable="false" />
						<button
							class="tile-remove"
							aria-label="Remove photo"
							disabled={identifying}
							onclick={() => remove(shot)}
						>
							<Icon name="close" size={14} strokeWidth={2.6} />
						</button>
						<button
							class="organ"
							class:set={shot.organ !== 'auto'}
							disabled={identifying}
							aria-label="Part of the plant: {ORGAN_LABELS[shot.organ]}. Tap to change."
							onclick={() => cycleOrgan(shot)}
						>
							{ORGAN_LABELS[shot.organ]}
						</button>
					</li>
				{/each}
				{#if room > 0}
					<li class="tile add">
						<button
							class="add-btn pressable"
							disabled={identifying}
							onclick={() => cameraInput?.click()}
						>
							<Icon name="camera" size={22} />
							<span>Add photo</span>
						</button>
					</li>
				{/if}
			</ul>
			<div class="photo-meta">
				<p class="hint">
					{shots.length} of {MAX_PHOTOS} · Tap a label to say which part each photo shows. More angles
					(leaves, fruit, bark) help.
				</p>
				{#if room > 0}
					<button class="link" disabled={identifying} onclick={() => uploadInput?.click()}>
						Choose from photos
					</button>
				{/if}
			</div>
		{/if}
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
			onchange={(event) => take(event.currentTarget)}
		/>
	</section>

	<!-- Problems ────────────────────────────────────────────── -->
	{#if problem}
		<section class="problem glass" role="alert" transition:slide={{ duration: 260 }}>
			<span class="problem-icon"><Icon name="warning" size={20} /></span>
			<div class="problem-text">
				<h2>{problem.title}</h2>
				<p>{problem.detail}</p>
				{#if problem.action === 'key'}
					<button class="btn glass small" onclick={fixKey}>Connect again</button>
				{:else if problem.action === 'save'}
					<button class="btn glass small" onclick={() => addToJournal()}>
						Save as a new flower
					</button>
				{/if}
			</div>
		</section>
	{/if}

	<!-- Results ─────────────────────────────────────────────── -->
	{#if results}
		<section class="results" aria-label="Suggestions" bind:this={resultsSection}>
			<h2 class="eyebrow">Suggestions</h2>
			<ol>
				{#each results as result, i (result.candidate.scientificName)}
					{@const { candidate, match } = result}
					<li
						class="result glass"
						class:best={i === 0}
						class:in-database={match}
						in:fly={{ y: 16, duration: 360, delay: i * 70, easing: cubicOut }}
					>
						<div class="result-head">
							{#if match}
								<SpeciesThumb src={match.species.image} size={56} />
							{:else}
								<span class="thumb-empty"><Icon name="flower" size={24} /></span>
							{/if}
							<div class="result-names">
								<span class="scientific">{candidate.scientificName}</span>
								<span class="common">
									{candidate.commonNames.slice(0, 3).join(' · ') || candidate.family}
								</span>
							</div>
							<span class="score" class:low={candidate.score < 0.2}>
								{percent(candidate.score)}%
							</span>
						</div>
						<div class="meter" aria-hidden="true">
							<span style:width="{percent(candidate.score)}%"></span>
						</div>
						{#if match}
							<p class="db in">
								<span class="db-check"><Icon name="check" size={11} strokeWidth={3} /></span>
								In the database as <strong>{match.species.name}</strong>
							</p>
						{:else}
							<p class="db">Not in the flower database</p>
						{/if}
						<div class="result-actions">
							<button class="btn btn-primary small" onclick={() => addToJournal(result)}>
								<Icon name="plus" size={16} strokeWidth={2.4} />
								Add to journal
							</button>
							{#if match}
								<a
									class="btn glass small"
									href={resolve('/database/[id]', { id: String(match.species.id) })}
								>
									View in database
								</a>
							{/if}
						</div>
					</li>
				{/each}
			</ol>
			<div class="after">
				<button class="btn glass" onclick={() => addToJournal()}>
					None of these? Add it yourself
				</button>
				<button class="link" onclick={startOver}>Start over</button>
			</div>
			{#if plantnet.remaining !== undefined}
				<p class="quota">{plantnet.remaining} identifications left today</p>
			{/if}
		</section>
	{/if}
</main>

{#if shots.length && !results}
	<div class="identify-wrap" transition:fly={{ y: 40, duration: 320, easing: cubicOut }}>
		<button
			class="btn btn-primary identify"
			disabled={!plantnet.key || identifying}
			onclick={start}
		>
			{#if identifying}
				<span class="spinner" aria-hidden="true"></span>
				Identifying…
			{:else}
				<Icon name="scan" size={20} />
				Identify
			{/if}
		</button>
	</div>
{/if}

<Sheet bind:open={noticeOpen} title="Before you identify">
	<div class="notice">
		<p>
			Your photos are sent to <strong>Pl@ntNet</strong>, a botanical research project, to identify
			the plant. Your journal and everything else stay on this device.
		</p>
		<button class="btn btn-primary btn-block" onclick={acceptNotice}>Continue</button>
		<button class="btn btn-block notice-cancel" onclick={() => (noticeOpen = false)}>
			Not now
		</button>
	</div>
</Sheet>

<FlowerFormSheet bind:open={formOpen} initial={formInitial} {oncreated} />

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
		gap: 18px;
	}

	.intro {
		padding: 8px 4px 0;
	}

	h1 {
		margin: 0;
		font-size: 48px;
		letter-spacing: -0.025em;
	}

	.lede {
		margin: 6px 0 0;
		font-size: 15px;
		color: var(--color-text-muted);
	}

	.card {
		display: grid;
		gap: 10px;
		padding: 16px 16px 14px;
		border-radius: var(--radius-lg);
		box-shadow:
			inset 0 1px 0 var(--glass-highlight),
			var(--shadow-sm);
	}

	.card h2 {
		margin: 0;
	}

	.card-text {
		margin: 0;
		font-size: 14px;
		line-height: 1.5;
		color: var(--color-text-muted);
	}

	/* Photos */

	.photos {
		display: grid;
		gap: 10px;
	}

	.capture {
		display: grid;
		justify-items: center;
		gap: 6px;
		padding: 34px 20px 30px;
		border-radius: var(--radius-lg);
		color: var(--color-text);
		box-shadow:
			inset 0 1px 0 var(--glass-highlight),
			var(--shadow-md);
	}

	.capture-icon {
		display: grid;
		place-items: center;
		width: 72px;
		height: 72px;
		margin-bottom: 8px;
		border-radius: 50%;
		color: var(--color-primary-text);
		background: var(--color-primary);
		box-shadow: 0 8px 24px color-mix(in srgb, var(--color-primary) 35%, transparent);
	}

	.capture-title {
		font-size: 18px;
		font-weight: 650;
		letter-spacing: -0.02em;
	}

	.capture-detail {
		font-size: 14px;
		color: var(--color-text-muted);
	}

	.choose {
		height: 52px;
		color: var(--color-text);
	}

	.tiles {
		list-style: none;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
		margin: 0;
		padding: 0;
	}

	.tile {
		position: relative;
		aspect-ratio: 1;
		border-radius: var(--radius-md);
		overflow: hidden;
		background: var(--color-separator);
		box-shadow: var(--shadow-sm);
	}

	.tile img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		user-select: none;
	}

	/* A light sweep across the photos while Pl@ntNet works. */
	.identifying .tile:not(.add)::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			100deg,
			transparent 30%,
			rgb(255 255 255 / 0.45) 50%,
			transparent 70%
		);
		background-size: 250% 100%;
		animation: sweep 1.4s ease-in-out infinite;
	}

	@keyframes sweep {
		from {
			background-position: 120% 0;
		}
		to {
			background-position: -120% 0;
		}
	}

	.tile-remove {
		position: absolute;
		top: 6px;
		right: 6px;
		display: grid;
		place-items: center;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		color: #fff;
		background: rgb(0 0 0 / 0.45);
		-webkit-backdrop-filter: blur(8px);
		backdrop-filter: blur(8px);
	}

	.organ {
		position: absolute;
		left: 6px;
		bottom: 6px;
		padding: 4px 9px;
		border-radius: var(--radius-full);
		font-size: 11.5px;
		font-weight: 650;
		color: #fff;
		background: rgb(0 0 0 / 0.45);
		-webkit-backdrop-filter: blur(8px);
		backdrop-filter: blur(8px);
		transition: background-color 200ms ease;
	}

	.organ.set {
		color: var(--color-primary-text);
		background: var(--color-primary);
	}

	.tile.add {
		background: none;
		box-shadow: none;
	}

	.add-btn {
		width: 100%;
		height: 100%;
		display: grid;
		place-content: center;
		justify-items: center;
		gap: 6px;
		border-radius: var(--radius-md);
		font-size: 13px;
		font-weight: 600;
		color: var(--color-primary);
		border: 1.5px dashed color-mix(in srgb, var(--color-primary) 45%, transparent);
		background: color-mix(in srgb, var(--color-primary) 6%, transparent);
	}

	.photo-meta {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		padding: 0 4px;
	}

	.hint {
		margin: 0;
		font-size: 12.5px;
		line-height: 1.45;
		color: var(--color-text-faint);
	}

	.link {
		flex-shrink: 0;
		padding: 4px 0;
		font-size: 14px;
		font-weight: 600;
		color: var(--color-primary);
	}

	/* Problems */

	.problem {
		display: flex;
		gap: 12px;
		padding: 16px;
		border-radius: var(--radius-lg);
		box-shadow:
			inset 0 1px 0 var(--glass-highlight),
			0 0 0 1px color-mix(in srgb, var(--color-danger) 25%, transparent),
			var(--shadow-sm);
	}

	.problem-icon {
		flex-shrink: 0;
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: 12px;
		color: var(--color-danger);
		background: color-mix(in srgb, var(--color-danger) 12%, transparent);
	}

	.problem-text {
		display: grid;
		gap: 4px;
		justify-items: start;
	}

	.problem h2 {
		margin: 0;
		font-size: 16px;
		font-weight: 650;
		letter-spacing: -0.015em;
	}

	.problem p {
		margin: 0 0 6px;
		font-size: 14px;
		line-height: 1.45;
		color: var(--color-text-muted);
		overflow-wrap: anywhere;
	}

	.btn.small {
		height: 38px;
		padding: 0 14px;
		gap: 6px;
		font-size: 14px;
		color: var(--color-text);
	}

	.btn-primary.small {
		color: var(--color-primary-text);
	}

	/* Results */

	.results {
		display: grid;
		gap: 10px;
		scroll-margin-top: calc(var(--safe-top) + 64px);
	}

	.results h2 {
		margin: 0;
		padding-left: 4px;
	}

	ol {
		list-style: none;
		display: grid;
		gap: 10px;
		margin: 0;
		padding: 0;
	}

	.result {
		display: grid;
		gap: 10px;
		padding: 12px;
		border-radius: var(--radius-lg);
		box-shadow:
			inset 0 1px 0 var(--glass-highlight),
			var(--shadow-sm);
	}

	.result.best {
		box-shadow:
			inset 0 1px 0 var(--glass-highlight),
			var(--shadow-md);
	}

	.result.in-database {
		background: color-mix(in srgb, var(--color-primary) 9%, var(--glass-bg));
		border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);
	}

	.result-head {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.thumb-empty {
		flex-shrink: 0;
		display: grid;
		place-items: center;
		width: 56px;
		height: 56px;
		border-radius: 15px;
		color: var(--color-text-faint);
		background: var(--color-separator);
	}

	.result-names {
		flex: 1;
		min-width: 0;
		display: grid;
		gap: 2px;
	}

	.scientific {
		font-family: var(--font-display);
		font-style: italic;
		font-size: 21px;
		line-height: 1.15;
		overflow-wrap: anywhere;
	}

	.common {
		font-size: 13.5px;
		color: var(--color-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.score {
		flex-shrink: 0;
		align-self: flex-start;
		padding: 3px 9px;
		border-radius: var(--radius-full);
		font-size: 13px;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 13%, transparent);
	}

	.score.low {
		color: var(--color-text-muted);
		background: color-mix(in srgb, var(--color-text) 7%, transparent);
	}

	.meter {
		height: 4px;
		border-radius: 2px;
		overflow: hidden;
		background: var(--color-separator);
	}

	.meter span {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: var(--color-primary);
		transform-origin: left;
		animation: grow 700ms var(--ease-out) both;
	}

	@keyframes grow {
		from {
			transform: scaleX(0);
		}
	}

	.db {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 0;
		font-size: 13.5px;
		color: var(--color-text-faint);
	}

	.db.in {
		color: var(--color-primary);
	}

	.db strong {
		font-weight: 650;
	}

	.db-check {
		display: grid;
		place-items: center;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		color: var(--color-primary-text);
		background: var(--color-primary);
	}

	.result-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.result-actions a {
		text-decoration: none;
	}

	.after {
		display: grid;
		justify-items: center;
		gap: 6px;
		margin-top: 6px;
	}

	.after .btn {
		height: 48px;
		padding: 0 20px;
		color: var(--color-text);
	}

	.quota {
		margin: 4px 0 0;
		text-align: center;
		font-size: 12px;
		color: var(--color-text-faint);
	}

	/* Identify button */

	.identify-wrap {
		position: fixed;
		left: 0;
		right: 0;
		bottom: calc(var(--safe-bottom) + 24px);
		z-index: 10;
		display: flex;
		justify-content: center;
		pointer-events: none;
	}

	.identify {
		height: 56px;
		min-width: 200px;
		padding: 0 28px;
		pointer-events: auto;
	}

	.spinner {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		border: 2.5px solid color-mix(in srgb, var(--color-primary-text) 35%, transparent);
		border-top-color: var(--color-primary-text);
		animation: spin 800ms linear infinite;
	}

	@keyframes spin {
		to {
			rotate: 360deg;
		}
	}

	/* Privacy notice */

	.notice {
		display: grid;
		gap: 10px;
	}

	.notice p {
		margin: 0 4px 8px;
		font-size: 15px;
		line-height: 1.55;
		color: var(--color-text-muted);
		text-align: center;
	}

	.notice strong {
		color: var(--color-text);
	}

	.notice-cancel {
		color: var(--color-text-muted);
		background: none;
	}
</style>
