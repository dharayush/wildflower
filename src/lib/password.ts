/**
 * Password hashing for the access gate, shared by the app (browser) and
 * `npm run set-password` (Node); both have Web Crypto. PBKDF2 with a random salt and many
 * iterations, because the hash ships in a public repo and must be slow to brute-force.
 */

export interface AccessHash {
	/** Base64. */
	salt: string;
	iterations: number;
	/** Base64 PBKDF2-SHA-256 output. */
	hash: string;
}

export const ITERATIONS = 310_000;

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0));

export async function hashPassword(
	password: string,
	salt: string,
	iterations: number
): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(password),
		'PBKDF2',
		false,
		['deriveBits']
	);
	const bits = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64(salt), iterations },
		key,
		256
	);
	return toBase64(new Uint8Array(bits));
}

export async function createAccessHash(password: string): Promise<AccessHash> {
	const salt = toBase64(crypto.getRandomValues(new Uint8Array(16)));
	return { salt, iterations: ITERATIONS, hash: await hashPassword(password, salt, ITERATIONS) };
}

export async function checkPassword(password: string, access: AccessHash): Promise<boolean> {
	return (await hashPassword(password, access.salt, access.iterations)) === access.hash;
}
