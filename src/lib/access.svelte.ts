import { browser, dev } from '$app/env';
import { ACCESS } from './access-hash.ts';
import { checkPassword } from './password.ts';

const KEY = 'access';

/**
 * The password gate in front of the hosted app. Once the right password is entered, the
 * device stays unlocked (until the password changes). It only keeps casual visitors out:
 * the app is a public static site, so it can't truly hide its files. `npm run dev` skips it.
 */
class Access {
	unlocked = $state(false);

	/** Whether a password has been set (`npm run set-password`); without one, it stays locked. */
	readonly configured = ACCESS !== null;

	constructor() {
		if (!browser) return;
		this.unlocked = dev || (ACCESS !== null && read() === ACCESS.hash);
	}

	async unlock(password: string): Promise<boolean> {
		if (!ACCESS || !(await checkPassword(password, ACCESS))) return false;
		try {
			localStorage.setItem(KEY, ACCESS.hash);
		} catch {
			// Not remembered; unlocked for this session only.
		}
		this.unlocked = true;
		return true;
	}
}

function read() {
	try {
		return localStorage.getItem(KEY);
	} catch {
		return null;
	}
}

export const access = new Access();
