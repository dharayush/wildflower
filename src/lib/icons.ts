/**
 * Placeholder icon set. Each entry is the inner markup of a 24×24 SVG drawn with
 * `stroke="currentColor"`, so icons inherit text color and theme automatically.
 *
 * To swap an icon, replace its markup here (e.g. paste the inner elements of an
 * SF Symbols / Lucide / custom export). Every component renders icons through
 * `<Icon name="…" />`, so changes apply app-wide.
 */
export const icons = {
	plus: '<path d="M12 5v14M5 12h14"/>',
	close: '<path d="M18 6 6 18M6 6l12 12"/>',
	check: '<path d="M20 6 9 17l-5-5"/>',
	back: '<path d="m15 18-6-6 6-6"/>',
	forward: '<path d="m9 18 6-6-6-6"/>',
	arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
	more: '<circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
	settings:
		'<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
	camera:
		'<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3.5"/>',
	image:
		'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.8"/><path d="m21 15-3.5-3.5a2 2 0 0 0-2.8 0L5 21"/>',
	trash:
		'<path d="M3 6h18M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6M18.5 6l-.9 13.1A2 2 0 0 1 15.6 21H8.4a2 2 0 0 1-2-1.9L5.5 6M10 11v6M14 11v6"/>',
	edit: '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/><path d="M14 6l4 4"/>',
	link: '<path d="M10 13.5a4.5 4.5 0 0 0 6.4.4l2.8-2.8a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2"/><path d="M14 10.5a4.5 4.5 0 0 0-6.4-.4l-2.8 2.8a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/>',
	sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
	moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
	system: '<rect x="2.5" y="4" width="19" height="13" rx="2.5"/><path d="M8 21h8M12 17v4"/>',
	journal:
		'<path d="M2.5 5h6A3.5 3.5 0 0 1 12 8.5V20a2.5 2.5 0 0 0-2.5-2.5h-7z"/><path d="M21.5 5h-6A3.5 3.5 0 0 0 12 8.5V20a2.5 2.5 0 0 1 2.5-2.5h7z"/>',
	database:
		'<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
	flower:
		'<circle cx="12" cy="10" r="2.5"/><path d="M12 7.5c0-2.5 1.2-4.5 2.5-4.5S17 4.5 15 7.5c2.5-1 4.5-.3 4.5 1S17.5 11.5 14.5 10c2 2 2 4 .8 4.5S12 13.5 12 12.5c0 1-2.2 2.7-3.3 2S7.5 12 9.5 10c-3 1.5-5 .5-5-1.5s2-2 4.5-1C7 4.5 8.3 3 9.5 3S12 5 12 7.5z"/><path d="M12 15v6M12 18.5c-1.5-1.5-3.5-2-5-1.5"/>',
	share:
		'<path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5.5A1.5 1.5 0 0 0 4 12.5v7A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5H18"/>',
	'add-square':
		'<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8.5v7M8.5 12h7"/>',
	'menu-vertical':
		'<circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none"/>',
	download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M5 20h14"/>',
	search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
	arrange: '<path d="M3.5 6h10M3.5 12h7M3.5 18h4"/><path d="M18 5v14M14.5 15.5 18 19l3.5-3.5"/>',
	'chevron-down': '<path d="m6 9 6 6 6-6"/>',
	external:
		'<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
	clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
	warning:
		'<path d="M10.3 4.2 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4M12 17h.01"/>',
	butterfly:
		'<path d="M12 7v12"/><path d="M12 9C10 5 4.5 3.5 4 6.5s1.5 5.5 5 5.5c-3 .5-4.5 3-3 4.8S11 16.5 12 13"/><path d="M12 9c2-4 7.5-5.5 8-2.5s-1.5 5.5-5 5.5c3 .5 4.5 3 3 4.8S13 16.5 12 13"/>',
	lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/>',
	sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
	undo: '<path d="M4 8h10.5a5.5 5.5 0 0 1 0 11H8"/><path d="M8 4 4 8l4 4"/>'
} as const;

export type IconName = keyof typeof icons;
