// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		interface PageState {
			/** Set while the journal pager shows the Database pane, so Back returns to Journal. */
			pane?: 'database';
		}
		// interface Platform {}
	}
}

export {};
