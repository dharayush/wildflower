export interface Toast {
	id: number;
	message: string;
	action?: { label: string; run: () => void };
}

class Toasts {
	items = $state<Toast[]>([]);
	#nextId = 0;
	#timers = new Map<number, ReturnType<typeof setTimeout>>();

	/** `duration: null` keeps the toast up until its action is used or it's replaced. */
	show(
		message: string,
		options: { action?: Toast['action']; duration?: number | null } = {}
	): number {
		const id = this.#nextId++;
		// One toast at a time keeps the bottom of the screen calm.
		this.items.forEach((t) => this.dismiss(t.id));
		this.items.push({ id, message, action: options.action });
		const duration = options.duration === undefined ? 5000 : options.duration;
		if (duration !== null) {
			this.#timers.set(
				id,
				setTimeout(() => this.dismiss(id), duration)
			);
		}
		return id;
	}

	dismiss(id: number) {
		clearTimeout(this.#timers.get(id));
		this.#timers.delete(id);
		this.items = this.items.filter((t) => t.id !== id);
	}
}

export const toasts = new Toasts();
