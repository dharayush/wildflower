<script lang="ts">
	import { fly } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import { toasts } from '#lib/toast.svelte.ts';
</script>

<div class="toaster" aria-live="polite">
	{#each toasts.items as toast (toast.id)}
		<div
			class="toast glass glass-strong"
			in:fly={{ y: 40, duration: 420, easing: backOut }}
			out:fly={{ y: 20, duration: 200 }}
		>
			<span>{toast.message}</span>
			{#if toast.action}
				<button
					class="action pressable"
					onclick={() => {
						toast.action!.run();
						toasts.dismiss(toast.id);
					}}
				>
					{toast.action.label}
				</button>
			{/if}
		</div>
	{/each}
</div>

<style>
	.toaster {
		position: fixed;
		left: 0;
		right: 0;
		bottom: calc(var(--safe-bottom) + 96px);
		display: grid;
		justify-items: center;
		pointer-events: none;
		z-index: 100;
	}

	.toast {
		grid-area: 1 / 1;
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 10px 10px 10px 20px;
		border-radius: var(--radius-full);
		font-size: 15px;
		font-weight: 500;
		pointer-events: auto;
		box-shadow: var(--shadow-lg);
		max-width: calc(100vw - 2 * var(--gutter));
	}

	.toast span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.action {
		padding: 8px 14px;
		border-radius: var(--radius-full);
		font-weight: 600;
		color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 12%, transparent);
	}
</style>
