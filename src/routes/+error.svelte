<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { art } from '#lib/art.ts';
</script>

<main>
	<img src={art.flowerPlaceholder} alt="" />
	<h1 class="display">{page.status === 404 ? 'Not found' : 'Something went wrong'}</h1>
	<p>{page.error?.message}</p>
	<a class="btn btn-primary" href={resolve('/journal')}>Back to Journal</a>
</main>

<style>
	main {
		min-height: 100dvh;
		display: grid;
		place-content: center;
		justify-items: center;
		gap: 12px;
		padding: 32px;
		text-align: center;
	}

	img {
		width: 120px;
		border-radius: 32px;
		box-shadow: var(--shadow-md);
		margin-bottom: 12px;
	}

	h1 {
		margin: 0;
		font-size: 40px;
	}

	p {
		margin: 0 0 12px;
		color: var(--color-text-muted);
	}

	a {
		text-decoration: none;
	}
</style>
