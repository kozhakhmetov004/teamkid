<script lang="ts">
	import ComingSoonBadge from './ComingSoonBadge.svelte';
	import { pricing } from './content.js';
	import { reveal } from './reveal.js';

	let { signedIn, homePath }: { signedIn: boolean; homePath: string } = $props();
</script>

<section id="pricing" class="bg-(--mk-mint)" aria-labelledby="pricing-title">
	<div class="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
		<div class="max-w-2xl" use:reveal>
			<h2 id="pricing-title" class="text-3xl font-bold tracking-tight text-(--mk-ink) sm:text-4xl">
				{pricing.title}
			</h2>
			<p class="mt-3 text-lg font-semibold text-(--mk-green)">{pricing.note}</p>
			<p class="mt-1 text-base text-(--mk-muted)">{pricing.subnote}</p>
		</div>

		<ul class="mt-10 grid gap-5 lg:grid-cols-3">
			{#each pricing.plans as plan, i (plan.name)}
				<li
					class="flex flex-col rounded-[28px] bg-(--mk-white) p-7 {plan.highlight
						? 'shadow-lg ring-2 ring-(--mk-green)'
						: 'shadow-sm'}"
					use:reveal={i * 90}
				>
					<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
						<h3 class="text-xl font-bold text-(--mk-ink)">{plan.name}</h3>
						<ComingSoonBadge status={plan.status} />
					</div>
					<p class="mt-4">
						<span class="text-4xl font-extrabold tracking-tight text-(--mk-ink)">{plan.price}</span>
						{#if plan.period}<span class="mt-1 block text-sm text-(--mk-muted)">{plan.period}</span
							>{/if}
					</p>
					<ul class="mt-6 flex-1 space-y-3">
						{#each plan.items as item (item.text)}
							<li class="flex flex-col gap-1 text-base text-(--mk-text)">
								<span class="flex gap-2"
									><span aria-hidden="true" class="text-(--mk-green)">✓</span>{item.text}</span
								>
								{#if item.status !== 'live' && plan.status === 'live'}
									<ComingSoonBadge status={item.status} class="ml-6 self-start" />
								{/if}
							</li>
						{/each}
					</ul>
					{#if plan.status === 'live'}
						<a
							href={signedIn ? homePath : '/login'}
							class="mk-btn mt-7 {plan.highlight ? 'mk-btn-primary' : 'mk-btn-outline'}"
						>
							{signedIn ? 'Open TeamKid' : 'Start free'}
						</a>
					{/if}
				</li>
			{/each}
		</ul>
	</div>
</section>
