<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Icon from './Icon.svelte';

	let {
		photos,
		start,
		onclose,
		ondelete
	}: {
		photos: { key: string | number; src: string }[];
		start: number;
		onclose: () => void;
		/** Shows a delete button; receives the index of the photo on screen. */
		ondelete?: (index: number) => void;
	} = $props();

	let track = $state<HTMLElement>();
	// svelte-ignore state_referenced_locally
	let index = $state(start);

	onMount(() => {
		track!.scrollLeft = start * track!.clientWidth;
		const onkeydown = (e: KeyboardEvent) => e.key === 'Escape' && onclose();
		window.addEventListener('keydown', onkeydown);
		return () => window.removeEventListener('keydown', onkeydown);
	});

	function onscroll() {
		index = Math.round(track!.scrollLeft / track!.clientWidth);
	}

	function remove() {
		if (!photos[index]) return;
		if (photos.length === 1) onclose();
		ondelete?.(index);
	}

	// Close if the last photo went away underneath us.
	$effect(() => {
		if (photos.length === 0) onclose();
	});
</script>

<div
	class="viewer"
	role="dialog"
	aria-modal="true"
	aria-label="Photo viewer"
	transition:fade={{ duration: 220 }}
>
	<div
		class="track"
		bind:this={track}
		{onscroll}
		in:scale={{ start: 0.94, duration: 320, easing: cubicOut }}
	>
		{#each photos as photo (photo.key)}
			<div class="frame">
				<img src={photo.src} alt="" draggable="false" />
			</div>
		{/each}
	</div>

	<div class="bar">
		<button class="icon-btn glass" aria-label="Close" onclick={onclose}>
			<Icon name="close" strokeWidth={2} />
		</button>
		<span class="count glass">{Math.min(index + 1, photos.length)} / {photos.length}</span>
		{#if ondelete}
			<button class="icon-btn glass" aria-label="Delete photo" onclick={remove}>
				<Icon name="trash" />
			</button>
		{:else}
			<span class="spacer"></span>
		{/if}
	</div>
</div>

<style>
	.viewer {
		position: fixed;
		inset: 0;
		z-index: 60;
		background: rgb(0 0 0 / 0.88);
		-webkit-backdrop-filter: blur(30px) saturate(140%);
		backdrop-filter: blur(30px) saturate(140%);
		color: #fff;
		/* Glass controls stay dark-themed over photos regardless of app theme. */
		--glass-bg: rgb(40 40 40 / 0.5);
		--glass-border: rgb(255 255 255 / 0.14);
		--glass-highlight: rgb(255 255 255 / 0.18);
		--glass-edge: rgb(0 0 0 / 0.4);
	}

	.track {
		height: 100%;
		display: flex;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		scrollbar-width: none;
	}

	.track::-webkit-scrollbar {
		display: none;
	}

	.frame {
		flex: 0 0 100%;
		height: 100%;
		display: grid;
		place-items: center;
		scroll-snap-align: center;
		padding: calc(var(--safe-top) + 70px) 0 calc(var(--safe-bottom) + 30px);
	}

	.frame img {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		user-select: none;
	}

	.bar {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: calc(var(--safe-top) + 10px) 16px 0;
	}

	.bar .icon-btn {
		width: 44px;
		height: 44px;
	}

	.spacer {
		width: 44px;
	}

	.count {
		padding: 8px 14px;
		border-radius: var(--radius-full);
		font-size: 13px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
</style>
