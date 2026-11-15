<script lang="ts">
	import { page } from '$app/state';

	const PARENT_NAV = [
		{ href: '/dashboard', label: 'Dashboard' },
		{ href: '/calendar', label: 'Calendar' },
		{ href: '/messages', label: 'Messages' },
		{ href: '/expenses', label: 'Expenses' },
		{ href: '/documents', label: 'Documents' },
		{ href: '/family', label: 'Family' }
	] as const;

	const isActive = (href: string) =>
		page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
</script>

<nav aria-label="Main" class="-mx-4 overflow-x-auto px-4">
	<ul class="flex min-w-max gap-1">
		{#each PARENT_NAV as item (item.href)}
			<li>
				<a
					href={item.href}
					aria-current={isActive(item.href) ? 'page' : undefined}
					class="inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
				>
					{item.label}
				</a>
			</li>
		{/each}
	</ul>
</nav>
