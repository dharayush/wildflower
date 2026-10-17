<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { backOut } from 'svelte/easing';

	let { onclose }: { onclose: () => void } = $props();

	/** The note can't be dismissed early; it stays up for exactly this long. */
	const VISIBLE_MS = 5000;

	const friends = ['🐢', '❤️', '🐻‍❄️'];

	$effect(() => {
		const timer = setTimeout(onclose, VISIBLE_MS);
		return () => clearTimeout(timer);
	});
</script>

<!-- Covers the page and swallows taps while visible, so nothing underneath reacts. -->
<div class="layer" role="status" aria-label="🐢 ❤️ 🐻‍❄️" transition:fade={{ duration: 300 }}>
	<div
		class="card glass glass-strong"
		aria-hidden="true"
		in:scale={{ start: 0.6, duration: 650, easing: backOut }}
		out:scale={{ start: 0.9, duration: 250 }}
	>
		<span class="sparkle s1">✦</span>
		<span class="sparkle s2">✧</span>
		<span class="sparkle s3">✦</span>
		<p class="friends">
			{#each friends as emoji, i (i)}
				<span class:still={emoji === '❤️'} style:--i={i}>{emoji}</span>
			{/each}
		</p>
	</div>
</div>

<style>
	.layer {
		position: fixed;
		inset: 0;
		z-index: 80;
		display: grid;
		place-items: center;
		user-select: none;
		-webkit-user-select: none;
		background: radial-gradient(
			circle at 50% 45%,
			color-mix(in srgb, var(--blob-1) 55%, transparent),
			var(--scrim) 70%
		);
		-webkit-backdrop-filter: blur(10px);
		backdrop-filter: blur(10px);
	}

	.card {
		padding: 34px 38px;
		border-radius: 36px;
		box-shadow:
			inset 0 1px 0 var(--glass-highlight),
			0 0 0 8px color-mix(in srgb, var(--blob-1) 35%, transparent),
			var(--shadow-lg);
		animation: breathe 3.2s ease-in-out infinite;
	}

	.friends {
		display: flex;
		gap: 18px;
		margin: 0;
		font-size: 52px;
		line-height: 1;
	}

	.friends span {
		display: inline-block;
		animation: bob 1.8s ease-in-out infinite;
		animation-delay: calc(var(--i) * 0.22s);
	}

	.friends span.still {
		animation: none;
	}

	.sparkle {
		position: absolute;
		color: var(--color-accent);
		animation: twinkle 1.6s ease-in-out infinite;
	}

	.s1 {
		top: 10px;
		left: 16px;
		font-size: 16px;
	}

	.s2 {
		top: 14px;
		right: 18px;
		font-size: 13px;
		animation-delay: 0.5s;
	}

	.s3 {
		bottom: 12px;
		right: 40%;
		font-size: 11px;
		animation-delay: 1s;
	}

	@keyframes bob {
		50% {
			transform: translateY(-8px) rotate(-4deg);
		}
	}

	@keyframes breathe {
		50% {
			transform: scale(1.03);
		}
	}

	@keyframes twinkle {
		0%,
		100% {
			opacity: 0.2;
			transform: scale(0.7);
		}
		50% {
			opacity: 1;
			transform: scale(1.1);
		}
	}
</style>
