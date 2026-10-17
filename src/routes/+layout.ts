// Render entirely in the browser; prerender an empty shell so the
// service worker can cache it and boot the app offline.
export const ssr = false;
export const prerender = true;
