/**
 * `use:reveal` — subtle fade/rise when a section scrolls into view.
 * Progressive: content is visible without JavaScript, already-visible content
 * never animates, and nothing moves under prefers-reduced-motion.
 * Styles (.reveal-hidden / [data-reveal]) live in the marketing layout.
 */
export function reveal(node: HTMLElement, delayMs = 0) {
	if (typeof window === 'undefined') return;
	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (reduced || !('IntersectionObserver' in window)) return;
	if (node.getBoundingClientRect().top < window.innerHeight * 0.9) return;

	node.dataset.reveal = '';
	node.style.transitionDelay = `${delayMs}ms`;
	node.classList.add('reveal-hidden');
	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					node.classList.remove('reveal-hidden');
					observer.disconnect();
				}
			}
		},
		{ rootMargin: '0px 0px -8% 0px' }
	);
	observer.observe(node);
	return {
		destroy() {
			observer.disconnect();
		}
	};
}
