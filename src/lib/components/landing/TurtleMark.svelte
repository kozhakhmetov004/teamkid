<script lang="ts">
	/** Small logo mark (turtle head + shell). Decorative: the wordmark carries the name. */
	let { class: className = 'size-8' }: { class?: string } = $props();
</script>

<svg viewBox="0 0 40 40" class={className} aria-hidden="true">
	<path d="M6 30 C 6 19 12 13 20 13 C 28 13 34 19 34 30 Z" fill="#2f6b45" />
	<polygon points="15,22 18,18.5 22,18.5 25,22 22,25.5 18,25.5" fill="#3f8a5c" />
	<circle cx="20" cy="11" r="8" fill="#a6d96a" />
	<circle cx="17" cy="10" r="1.6" fill="#1d2a24" />
	<circle cx="23" cy="10" r="1.6" fill="#1d2a24" />
	<path
		d="M17.5 13.4 Q20 15.4 22.5 13.4"
		fill="none"
		stroke="#1d2a24"
		stroke-width="1.2"
		stroke-linecap="round"
	/>
	<rect x="6" y="29" width="28" height="3" rx="1.5" fill="#fff3d6" />
</svg>
