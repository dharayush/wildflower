<script lang="ts">
	import { art } from '#lib/art.ts';

	/**
	 * A database species photo (hosted on flowersofindia.net), loaded lazily. Falls back to
	 * the placeholder art when there's no photo, it's offline, or the link is dead.
	 */
	let {
		src,
		size,
		radius = Math.round(size * 0.26),
		transitionName
	}: {
		src?: string;
		size: number;
		radius?: number;
		/** view-transition-name, for morphing into the species page. */
		transitionName?: string;
	} = $props();

	let failed = $state(false);
	let loaded = $state(false);

	// A recycled element (virtual list) may get a new photo.
	$effect.pre(() => {
		void src;
		failed = false;
		loaded = false;
	});
</script>

<span
	class="thumb"
	class:loaded={loaded || failed || !src}
	style:width="{size}px"
	style:height="{size}px"
	style:border-radius="{radius}px"
	style:view-transition-name={transitionName}
>
	{#if src && !failed}
		<img
			{src}
			alt=""
			loading="lazy"
			decoding="async"
			draggable="false"
			onload={() => (loaded = true)}
			onerror={() => (failed = true)}
		/>
	{:else}
		<img class="placeholder" src={art.flowerPlaceholder} alt="" draggable="false" />
	{/if}
</span>

<style>
	.thumb {
		flex-shrink: 0;
		display: block;
		overflow: hidden;
		background: var(--color-separator);
		box-shadow: inset 0 0 0 1px var(--color-separator);
	}

	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0;
		transition: opacity 250ms ease;
		user-select: none;
	}

	.loaded img {
		opacity: 1;
	}
</style>
