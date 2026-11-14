<script lang="ts">
	import Calendar from '@lucide/svelte/icons/calendar';
	import CheckCheck from '@lucide/svelte/icons/check-check';
	import FileText from '@lucide/svelte/icons/file-text';
	import FolderLock from '@lucide/svelte/icons/folder-lock';
	import MapIcon from '@lucide/svelte/icons/map';
	import Radio from '@lucide/svelte/icons/radio';
	import Repeat from '@lucide/svelte/icons/repeat';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Turtle from '@lucide/svelte/icons/turtle';
	import Wallet from '@lucide/svelte/icons/wallet';

	/** Decorative icon by name (the text next to it always carries the meaning). */
	let { name, class: className = 'size-6' }: { name: string; class?: string } = $props();

	const icons = {
		calendar: Calendar,
		'check-check': CheckCheck,
		'file-text': FileText,
		'folder-lock': FolderLock,
		map: MapIcon,
		radio: Radio,
		repeat: Repeat,
		sparkles: Sparkles,
		turtle: Turtle,
		wallet: Wallet
	} as const;
	const Component = $derived(icons[name as keyof typeof icons] ?? Sparkles);
</script>

<Component class={className} aria-hidden="true" />
