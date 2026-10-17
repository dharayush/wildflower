<script lang="ts">
	import type { Snippet } from 'svelte';
	import { art } from '#lib/art.ts';

	/**
	 * Full-screen brand layout (floating glass orb, wordmark) shared by the
	 * app's landing page and the browser install page. `children` renders the actions.
	 * Pass `onorbpress` to make the orb a tappable button with a press ripple.
	 */
	let { children, onorbpress }: { children: Snippet; onorbpress?: () => void } = $props();

	let ripples = $state<number[]>([]);
	let rippleId = 0;

	function press() {
		const id = rippleId++;
		ripples.push(id);
		setTimeout(() => (ripples = ripples.filter((r) => r !== id)), 700);
		onorbpress?.();
	}
</script>

<main>
	<div class="hero" style:--i={0}>
		<div class="halo" aria-hidden="true"></div>
		{#if onorbpress}
			<button class="orb-press" aria-label="Wildflower" onclick={press}>
				<span class="orb glass">
					<img src={art.hero} alt="" draggable="false" />
					{#each ripples as id (id)}
						<span class="ripple" aria-hidden="true"></span>
					{/each}
				</span>
			</button>
		{:else}
			<span class="orb glass">
				<img src={art.hero} alt="" draggable="false" />
			</span>
		{/if}
	</div>

	<div class="copy">
		<p class="eyebrow" style:--i={1}>Field journal</p>
		<h1 class="display" style:--i={2}>Wildflower</h1>
	</div>

	<div class="actions" style:--i={3}>
		{@render children()}
	</div>
</main>

<style>
	main {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 40px;
		padding: calc(var(--safe-top) + 40px) 28px calc(var(--safe-bottom) + 32px);
		text-align: center;
		/* The spinning halo's rotated corners would otherwise widen the page on phones. */
		overflow-x: clip;
	}

	[style*='--i'] {
		animation: rise 900ms var(--ease-out) both;
		animation-delay: calc(var(--i) * 90ms + 100ms);
	}

	.hero {
		position: relative;
		width: min(68vw, 300px);
		aspect-ratio: 1;
	}

	/* The press scale lives on the button so it composes with the orb's float animation. */
	.orb-press {
		position: absolute;
		inset: 0;
		z-index: 1;
		border-radius: 50%;
		-webkit-touch-callout: none;
		user-select: none;
		transition: transform 500ms var(--ease-spring);
	}

	.orb-press:active {
		transform: scale(0.94);
		transition-duration: 120ms;
		transition-timing-function: ease-out;
	}

	.orb {
		position: absolute;
		inset: 0;
		z-index: 1;
		border-radius: 50%;
		display: grid;
		place-items: center;
		box-shadow:
			inset 0 1px 0 var(--glass-highlight),
			inset 0 -20px 40px color-mix(in srgb, var(--blob-1) 25%, transparent),
			var(--shadow-lg);
		animation: float 7s ease-in-out infinite;
	}

	.orb img {
		width: 82%;
		filter: drop-shadow(0 18px 24px rgb(226 85 127 / 0.25));
		animation: sway 9s ease-in-out infinite;
		transform-origin: 50% 90%;
		pointer-events: none;
		user-select: none;
	}

	/* A soft glass ring that pulses outward from the orb on each tap. */
	.ripple {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		pointer-events: none;
		border: 1.5px solid var(--glass-border);
		box-shadow:
			0 0 24px color-mix(in srgb, var(--blob-1) 60%, transparent),
			inset 0 0 24px color-mix(in srgb, var(--blob-1) 40%, transparent);
		animation: ripple 700ms var(--ease-out) forwards;
	}

	.halo {
		position: absolute;
		inset: -18%;
		border-radius: 50%;
		background: conic-gradient(
			from 0deg,
			var(--blob-1),
			var(--blob-3),
			var(--blob-2),
			var(--blob-1)
		);
		filter: blur(48px);
		opacity: 0.55;
		animation: spin 24s linear infinite;
	}

	.copy {
		display: grid;
		gap: 12px;
	}

	.copy .eyebrow {
		margin: 0;
	}

	h1 {
		margin: 0;
		font-size: clamp(64px, 19vw, 96px);
		letter-spacing: -0.03em;
		background: linear-gradient(180deg, var(--color-text) 30%, var(--color-text-muted));
		background-clip: text;
		-webkit-background-clip: text;
		color: transparent;
		padding-bottom: 0.08em;
	}

	.actions {
		width: 100%;
		max-width: 360px;
		display: grid;
		gap: 14px;
	}

	/* Shared look for whatever actions the page renders. */
	.actions :global(.btn) {
		height: 56px;
		font-size: 17px;
		text-decoration: none;
	}

	.actions :global(.fineprint) {
		margin: 0;
		font-size: 13px;
		color: var(--color-text-faint);
	}

	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(24px) scale(0.98);
			filter: blur(6px);
		}
	}

	@keyframes ripple {
		from {
			opacity: 0.9;
			transform: scale(0.92);
		}
		to {
			opacity: 0;
			transform: scale(1.22);
		}
	}

	@keyframes float {
		50% {
			transform: translateY(-10px);
		}
	}

	@keyframes sway {
		0%,
		100% {
			transform: rotate(-3deg);
		}
		50% {
			transform: rotate(3deg);
		}
	}

	@keyframes spin {
		to {
			transform: rotate(1turn);
		}
	}
</style>
