/**
 * Sets the password of the hosted app's access gate: asks for it (twice, hidden) and writes
 * only its salted PBKDF2 hash to src/lib/access-hash.ts. Commit and push that file to apply.
 * Devices unlocked with the old password are asked for the new one.
 *
 *   npm run set-password
 */
import { writeFileSync } from 'node:fs';
import { createAccessHash } from '../src/lib/password.ts';

const OUT = 'src/lib/access-hash.ts';
const MIN_LENGTH = 8;

/** Reads a line without echoing it, where the terminal allows. */
function ask(prompt: string): Promise<string> {
	const { stdin, stdout } = process;
	stdout.write(prompt);
	if (!stdin.isTTY) {
		// e.g. Git Bash's mintty: no raw mode, so the input will be visible.
		stdout.write('(input will be visible in this terminal) ');
	} else {
		stdin.setRawMode(true);
	}
	stdin.resume();
	stdin.setEncoding('utf8');
	return new Promise((done) => {
		let value = '';
		const onData = (chunk: string) => {
			for (const char of chunk) {
				if (char === '\u0003') {
					stdout.write('\n');
					process.exit(130);
				} else if (char === '\r' || char === '\n') {
					if (stdin.isTTY) stdin.setRawMode(false);
					stdin.pause();
					stdin.off('data', onData);
					stdout.write('\n');
					done(value);
					return;
				} else if (char === '\u007f' || char === '\b') {
					value = value.slice(0, -1);
				} else {
					value += char;
				}
			}
		};
		stdin.on('data', onData);
	});
}

const password = await ask('New password: ');
if (password.length < MIN_LENGTH) {
	console.error(`Use at least ${MIN_LENGTH} characters.`);
	process.exit(1);
}
if ((await ask('Repeat it: ')) !== password) {
	console.error('The passwords don’t match. Nothing was changed.');
	process.exit(1);
}

const access = await createAccessHash(password);
writeFileSync(
	OUT,
	`// Written by \`npm run set-password\`; don't edit by hand. \`null\` keeps the app locked.
import type { AccessHash } from './password.ts';

export const ACCESS: AccessHash | null = ${JSON.stringify(access, null, '\t')};
`
);
console.log(`Password set (${OUT}). Commit and push it to apply.`);
