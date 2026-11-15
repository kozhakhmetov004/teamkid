<script lang="ts">
	/** Today's two activities as big tiles, each showing "✓ Done" when done today. */
	import KidTile from './ui/KidTile.svelte';

	let { checkedInToday, wishedToday }: { checkedInToday: boolean; wishedToday: boolean } = $props();
</script>

<nav aria-label="Today" class="grid gap-4 sm:grid-cols-2">
	<KidTile
		href="/checkin"
		accent="mint"
		icon="😊"
		title="How are you?"
		hint="Tap a face"
		done={checkedInToday}
	/>
	<KidTile
		href="/wishes"
		accent="sun"
		icon="⭐"
		title="Wish cards"
		hint="Pick fun things"
		done={wishedToday}
	/>
</nav>
