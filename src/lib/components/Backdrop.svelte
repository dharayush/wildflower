<!-- Ambient, slowly drifting color fields that give the glass surfaces something to refract. -->
<div class="backdrop" aria-hidden="true">
	<div class="blob b1"></div>
	<div class="blob b2"></div>
	<div class="blob b3"></div>
	<div class="grain"></div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: -1;
		overflow: hidden;
		background: var(--color-bg);
		transition: background-color 400ms ease;
	}

	.blob {
		position: absolute;
		width: 70vmax;
		height: 70vmax;
		border-radius: 50%;
		filter: blur(80px);
		opacity: var(--blob-opacity);
		will-change: transform;
	}

	.b1 {
		background: radial-gradient(circle, var(--blob-1), transparent 65%);
		top: -25vmax;
		left: -20vmax;
		animation: drift-1 26s ease-in-out infinite alternate;
	}

	.b2 {
		background: radial-gradient(circle, var(--blob-2), transparent 65%);
		bottom: -30vmax;
		right: -25vmax;
		animation: drift-2 32s ease-in-out infinite alternate;
	}

	.b3 {
		background: radial-gradient(circle, var(--blob-3), transparent 65%);
		top: 30%;
		left: 35%;
		width: 50vmax;
		height: 50vmax;
		opacity: calc(var(--blob-opacity) * 0.6);
		animation: drift-3 38s ease-in-out infinite alternate;
	}

	/* Fine noise keeps large gradients from banding. */
	.grain {
		position: absolute;
		inset: 0;
		opacity: 0.035;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
	}

	@keyframes drift-1 {
		to {
			transform: translate(18vw, 12vh) scale(1.1);
		}
	}

	@keyframes drift-2 {
		to {
			transform: translate(-16vw, -14vh) scale(1.15);
		}
	}

	@keyframes drift-3 {
		to {
			transform: translate(-22vw, 10vh) scale(0.9);
		}
	}
</style>
