<script lang="ts">
	import FAQ from '#lib/components/landing/FAQ.svelte';
	import FeatureGrid from '#lib/components/landing/FeatureGrid.svelte';
	import FinalCTA from '#lib/components/landing/FinalCTA.svelte';
	import ForProfessionals from '#lib/components/landing/ForProfessionals.svelte';
	import Hero from '#lib/components/landing/Hero.svelte';
	import HowItWorks from '#lib/components/landing/HowItWorks.svelte';
	import MeetPebble from '#lib/components/landing/MeetPebble.svelte';
	import Pricing from '#lib/components/landing/Pricing.svelte';
	import ProblemStats from '#lib/components/landing/ProblemStats.svelte';
	import SafetySection from '#lib/components/landing/SafetySection.svelte';
	import { site } from '#lib/components/landing/content.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const ogImage = $derived(`${data.origin}/landing/og-image.png`);
	const canonical = $derived(`${data.origin}/`);
</script>

<svelte:head>
	<title>{site.title}</title>
	<meta name="description" content={site.description} />
	<link rel="canonical" href={canonical} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={site.name} />
	<meta property="og:title" content={site.title} />
	<meta property="og:description" content={site.description} />
	<meta property="og:url" content={canonical} />
	<meta property="og:image" content={ogImage} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta
		property="og:image:alt"
		content="TeamKid: Two homes. One team. One kid. With Pebble the turtle."
	/>
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={site.title} />
	<meta name="twitter:description" content={site.description} />
	<meta name="twitter:image" content={ogImage} />
	<meta name="theme-color" content="#0f3a30" />
</svelte:head>

<Hero signedIn={data.signedIn} homePath={data.homePath} />
<ProblemStats />
<HowItWorks />
<MeetPebble />
<FeatureGrid />
<SafetySection />
<ForProfessionals />
<Pricing signedIn={data.signedIn} homePath={data.homePath} />
<FAQ />
<FinalCTA signedIn={data.signedIn} homePath={data.homePath} />
