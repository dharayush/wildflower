<script lang="ts">
	import { icons, type IconName } from '#lib/icons.ts';

	let {
		name,
		size = 22,
		strokeWidth = 1.75
	}: { name: IconName; size?: number; strokeWidth?: number } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- static markup from icons.ts -->
	{@html icons[name]}
</svg>

<style>
	svg {
		flex-shrink: 0;
		display: block;
	}
</style>
