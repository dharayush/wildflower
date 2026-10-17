/**
 * Re-fetches descriptions the original scrape missed, from the same flowersofindia.net pages,
 * into flower-database/data/descriptions-refetched.json ({ source_url: description }), which
 * `npm run species` merges in. Only pages without a description are fetched.
 *
 *   node scripts/fetch-descriptions.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { pageDescription } from './species-text.ts';

const FULL = 'flower-database/flowers_full.json';
const OUT = 'flower-database/data/descriptions-refetched.json';

interface Row {
	source_url: string;
	description?: string;
	common_name_english?: string;
	common_name_index?: string;
}

const rows: Row[] = JSON.parse(readFileSync(FULL, 'utf8'));
const missing = rows.filter(
	(row) =>
		(row.common_name_english || row.common_name_index) &&
		(!row.description || row.description.trim().length < 20)
);

const found: Record<string, string> = {};
for (const [i, row] of missing.entries()) {
	try {
		const response = await fetch(row.source_url);
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const description = pageDescription(await response.text());
		if (description) found[row.source_url] = description;
		console.log(`${i + 1}/${missing.length}`, description ? 'ok  ' : 'none', row.source_url);
	} catch (error) {
		console.log(`${i + 1}/${missing.length}`, 'fail', row.source_url, String(error));
	}
	await new Promise((done) => setTimeout(done, 300));
}

writeFileSync(OUT, JSON.stringify(found, null, '\t') + '\n');
console.log(`Descriptions found: ${Object.keys(found).length} of ${missing.length}`);
