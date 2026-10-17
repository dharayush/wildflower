<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let {
		open = $bindable(false),
		title,
		children
	}: { open?: boolean; title?: string; children: Snippet } = $props();

	let dragY = $state(0);
	let dragging = $state(false);
	let startY = 0;
	let sheet = $state<HTMLElement>();

	function close() {
		open = false;
	}

	function onpointerdown(event: PointerEvent) {
		dragging = true;
		startY = event.clientY;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function onpointermove(event: PointerEvent) {
		if (!dragging) return;
		const delta = event.clientY - startY;
		// Resist upward drags, follow downward ones.
		dragY = delta < 0 ? delta / 6 : delta;
	}

	function onpointerup() {
		if (!dragging) return;
		dragging = false;
		if (sheet && dragY > Math.min(140, sheet.offsetHeight / 3)) close();
		dragY = 0;
	}

	$effect(() => {
		if (!open) return;
		const onkeydown = (e: KeyboardEvent) => e.key === 'Escape' && close();
		window.addEventListener('keydown', onkeydown);
		return () => window.removeEventListener('keydown', onkeydown);
	});
</script>

{#if open}
	<div class="layer">
		<button
			class="scrim"
			aria-label="Close"
			tabindex="-1"
			onclick={close}
			transition:fade={{ duration: 250 }}
		></button>

		<div
			bind:this={sheet}
			class="sheet glass glass-strong"
			class:dragging
			role="dialog"
			aria-modal="true"
			aria-label={title}
			style:transform="translateY({dragY}px)"
			transition:fly={{ y: 500, duration: 420, easing: cubicOut, opacity: 1 }}
		>
			<!-- Drag-to-dismiss is a pointer enhancement; Escape and the scrim cover keyboard/AT users. -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="handle-area"
				{onpointerdown}
				{onpointermove}
				{onpointerup}
				onpointercancel={onpointerup}
			>
				<div class="handle"></div>
				{#if title}<h2>{title}</h2>{/if}
			</div>
			<div class="content">
				{@render children()}
			</div>
		</div>
	</div>
{/if}

<style>
	.layer {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
	}

	.scrim {
		position: absolute;
		inset: 0;
		background: var(--scrim);
		cursor: default;
	}

	.sheet {
		position: relative;
		margin: 0 8px calc(8px + var(--safe-bottom));
		border-radius: 32px;
		max-height: calc(100dvh - var(--safe-top) - 40px);
		display: flex;
		flex-direction: column;
		box-shadow: var(--shadow-lg);
		transition: transform 380ms var(--ease-spring);
	}

	.sheet.dragging {
		transition: none;
	}

	@media (min-width: 560px) {
		.sheet {
			width: 520px;
			margin-inline: auto;
		}
	}

	.handle-area {
		padding: 10px 24px 4px;
		touch-action: none;
		cursor: grab;
	}

	.handle {
		width: 38px;
		height: 5px;
		border-radius: 3px;
		margin: 0 auto 14px;
		background: var(--color-text-faint);
		opacity: 0.5;
	}

	h2 {
		margin: 0 0 4px;
		font-size: 20px;
		font-weight: 650;
		letter-spacing: -0.02em;
		text-align: center;
	}

	.content {
		padding: 12px 20px 20px;
		overflow-y: auto;
	}
</style>
