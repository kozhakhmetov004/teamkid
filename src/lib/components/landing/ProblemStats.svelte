<script lang="ts">
	import { problem } from './content.js';
	import { reveal } from './reveal.js';
</script>

<section class="bg-(--mk-white)" aria-labelledby="problem-title">
	<div class="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
		<h2
			id="problem-title"
			class="max-w-2xl text-3xl font-bold tracking-tight text-(--mk-ink) sm:text-4xl"
			use:reveal
		>
			{problem.title}
		</h2>
		<ul class="mt-10 grid gap-5 md:grid-cols-3">
			{#each problem.stats as stat, i (stat.href)}
				<li class="flex flex-col rounded-[28px] bg-(--mk-mint) p-7" use:reveal={i * 90}>
					<p class="mk-display text-4xl font-black tracking-tight text-(--mk-ink) sm:text-5xl">
						{stat.value}
					</p>
					<p class="mt-3 flex-1 text-lg text-(--mk-text)">{stat.text}</p>
					<p class="mt-5 text-sm text-(--mk-muted)">
						Source:
						<a
							href={stat.href}
							target="_blank"
							rel="noopener noreferrer"
							class="underline underline-offset-2 hover:text-(--mk-ink)"
							>{stat.source}<span class="sr-only"> (opens in a new tab)</span></a
						>
					</p>
				</li>
			{/each}
		</ul>
		<p class="mt-10 max-w-3xl text-xl leading-relaxed text-(--mk-text)" use:reveal>
			{problem.closing}
			<a
				href={problem.closingSource.href}
				target="_blank"
				rel="noopener noreferrer"
				class="text-sm whitespace-nowrap text-(--mk-muted) underline underline-offset-2"
				>({problem.closingSource.label})<span class="sr-only"> (opens in a new tab)</span></a
			>
		</p>
	</div>
</section>
