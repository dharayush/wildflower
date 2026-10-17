import { describe, it, expect } from 'vitest';
import { checkPassword, createAccessHash, hashPassword } from './password.ts';

describe('password hashing', () => {
	it('accepts the right password and rejects others', async () => {
		const access = await createAccessHash('correct horse');
		expect(await checkPassword('correct horse', access)).toBe(true);
		expect(await checkPassword('Correct horse', access)).toBe(false);
		expect(await checkPassword('', access)).toBe(false);
	});

	it('salts each hash, and never stores the password', async () => {
		const a = await createAccessHash('same password');
		const b = await createAccessHash('same password');
		expect(a.salt).not.toBe(b.salt);
		expect(a.hash).not.toBe(b.hash);
		expect(JSON.stringify(a)).not.toContain('same password');
	});

	it('is deterministic for a given salt (PBKDF2-SHA-256)', async () => {
		// RFC 7914 test vector: P="passwd", S="salt", c=1, dkLen=32 (first 32 bytes of its 64).
		const salt = btoa('salt');
		expect(await hashPassword('passwd', salt, 1)).toBe(
			'VawEblbjCJ/sFpHCJUS2BflBhSFt3gRl5oudV8INrLw='
		);
	});
});
