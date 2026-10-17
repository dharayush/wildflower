/**
 * App version shown to the user, formatted `va.bb.ccc`:
 * - `a`   major changes
 * - `bb`  smaller changes (features, redesigns of a component)
 * - `ccc` very minor changes (copy, tweaks, fixes)
 * Bumping a part resets the parts after it to zero. Bump this with every change.
 *
 * Independent of SvelteKit's `version` from `$app/env`, which is a per-build
 * timestamp the service worker uses to key its cache.
 */
export const APP_VERSION = 'v2.04.000';
