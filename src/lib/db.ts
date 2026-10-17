import { Dexie, type EntityTable } from 'dexie';

export interface Flower {
	id: number;
	name: string;
	species?: string;
	notes: string;
	/** Set when the entry is linked to a species in the flower database. */
	speciesId?: number;
	/** Whether `speciesId` is set (kept as a field for list badges). */
	linked: boolean;
	createdAt: number;
	updatedAt: number;
}

export interface Photo {
	id: number;
	flowerId: number;
	blob: Blob;
	createdAt: number;
}

export const db = new Dexie('flower-tracker') as Dexie & {
	flowers: EntityTable<Flower, 'id'>;
	photos: EntityTable<Photo, 'id'>;
};

// Only indexed fields are listed here; bump the version and add a new
// `.stores()` call when the schema changes.
db.version(1).stores({
	flowers: '++id, name, createdAt',
	logs: '++id, flowerId, kind, date, [flowerId+date]'
});

db.version(2)
	.stores({
		flowers: '++id, name, createdAt, updatedAt',
		photos: '++id, flowerId, createdAt',
		logs: null
	})
	.upgrade((tx) =>
		tx
			.table('flowers')
			.toCollection()
			.modify((flower) => {
				flower.notes ??= '';
				flower.linked ??= false;
				flower.updatedAt ??= flower.createdAt;
			})
	);

// Links used to be a placeholder toggle with no species behind them; clear those.
db.version(3)
	.stores({
		flowers: '++id, name, createdAt, updatedAt',
		photos: '++id, flowerId, createdAt'
	})
	.upgrade((tx) =>
		tx
			.table('flowers')
			.toCollection()
			.modify((flower) => {
				flower.linked = flower.speciesId !== undefined;
			})
	);
