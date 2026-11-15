<script lang="ts">
	import Play from '@lucide/svelte/icons/play';
	import { demo } from './content.js';
	import { reveal } from './reveal.js';

	// Click-to-play: YouTube loads (privacy-enhanced domain) only after the visitor asks for it.
	let playing = $state<Record<string, boolean>>({});
</script>

<section id="demo" class="bg-(--mk-white)" aria-labelledby="demo-title">
	<div class="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
		<div class="max-w-2xl" use:reveal>
			<h2 id="demo-title" class="text-3xl font-bold tracking-tight text-(--mk-ink) sm:text-4xl">
				{demo.title}
			</h2>
			<p class="mt-4 text-lg text-(--mk-muted)">{demo.intro}</p>
		</div>

		<div class="mt-10 grid gap-5 md:grid-cols-2">
			{#each demo.videos as video, i (video.id)}
				<article
					class="flex flex-col overflow-hidden rounded-[28px] bg-(--mk-cream) shadow-sm"
					use:reveal={i * 90}
				>
					<div class="relative aspect-video bg-(--mk-ink)">
						{#if playing[video.id]}
							<iframe
								class="absolute inset-0 size-full"
								src="https://www.youtube-nocookie.com/embed/{video.id}?autoplay=1&rel=0"
								title="{video.label}: {video.title}"
								allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
								allowfullscreen
							></iframe>
						{:else}
							<button
								type="button"
								class="group absolute inset-0 size-full cursor-pointer"
								onclick={() => (playing[video.id] = true)}
							>
								<img
									src="https://i.ytimg.com/vi/{video.id}/hqdefault.jpg"
									alt=""
									loading="lazy"
									class="size-full object-cover opacity-90 transition group-hover:opacity-100"
								/>
								<span
									class="absolute inset-0 m-auto flex size-16 items-center justify-center rounded-full bg-(--mk-white) text-(--mk-green) shadow-md transition group-hover:scale-105"
								>
									<Play class="ml-1 size-7 fill-current" aria-hidden="true" />
								</span>
								<span class="sr-only">Play video: {video.label}, {video.title}</span>
							</button>
						{/if}
					</div>
					<div class="p-7">
						<span
							class="inline-flex rounded-full bg-(--mk-mint) px-3 py-1 text-sm font-semibold text-(--mk-green)"
						>
							{video.label}
						</span>
						<h3 class="mt-4 text-xl font-bold text-(--mk-ink)">{video.title}</h3>
						<p class="mt-2 text-base text-(--mk-text)">{video.text}</p>
						<a
							href="https://youtu.be/{video.id}"
							target="_blank"
							rel="noopener noreferrer"
							class="mt-4 inline-block text-sm font-semibold text-(--mk-green) underline-offset-4 hover:underline"
						>
							Watch on YouTube
						</a>
					</div>
				</article>
			{/each}
		</div>
	</div>
</section>
