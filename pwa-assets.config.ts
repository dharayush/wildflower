import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Matches --color-bg (light) in src/app.css and the manifest's background_color.
const background = '#f3f1ec';

// Regenerate icons with `npm run icons` after editing static/icon.svg, then bump the `?v=`
// on the icon URLs in static/manifest.webmanifest and src/app.html: the file names don't
// change, so without it caches (and Android's installed app) keep the old icons.
// Maskable (Android launcher + splash) and Apple icons are full-bleed: the default
// white padding would show as white edges around the icon.
export default defineConfig({
	preset: {
		...minimal2023Preset,
		maskable: { sizes: [512], padding: 0, resizeOptions: { background } },
		apple: { sizes: [180], padding: 0, resizeOptions: { background } }
	},
	images: ['static/icon.svg']
});
