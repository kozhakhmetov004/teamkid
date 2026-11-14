<script lang="ts">
	/** Today's two activities as big link cards, each showing "✓ Done" when done today. */
	import { KID_FOCUS } from '#lib/kids/ui.js';

	let { checkedInToday, wishedToday }: { checkedInToday: boolean; wishedToday: boolean } = $props();

	const items = $derived([
		{
			href: '/checkin',
			icon: '😊',
			title: 'How are you today?',
			hint: 'Tap a face',
			done: checkedInToday
		},
		{
			href: '/wishes',
			icon: '⭐',
			title: 'Wish cards',
			hint: 'Pick fun things',
			done: wishedToday
		}
	]);
</script>

<nav aria-label="Today" class="grid gap-4">
	{#each items as item (item.href)}
		<a
			href={item.href}
			class="group flex min-h-28 items-center gap-5 rounded-[2rem] border-2 bg-kid-surface px-6 py-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 {item.done
				? 'border-primary/40'
				: 'border-transparent'} {KID_FOCUS}"
		>
			<span
				class="flex size-20 shrink-0 items-center justify-center rounded-3xl bg-secondary text-5xl"
				aria-hidden="true">{item.icon}</span
			>
			<span class="flex flex-1 flex-col">
				<span class="text-3xl leading-tight font-bold">{item.title}</span>
				<span class="text-xl text-muted-foreground">{item.hint}</span>
			</span>
			{#if item.done}
				<span
					class="flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2 text-xl font-bold text-primary-foreground"
				>
					<span aria-hidden="true">✓</span> Done
				</span>
			{:else}
				<span class="shrink-0 text-4xl text-primary" aria-hidden="true">→</span>
			{/if}
		</a>
	{/each}
</nav>
