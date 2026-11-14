import { requireParent } from '#lib/server/guards.js';
import { stripeConfigured } from '#lib/server/stripe.js';
import { isActiveStatus } from '#lib/server/stripeCore.js';
import type { PageServerLoad } from './$types';

/** Billing (parent only): this parent's own subscription row (RLS: own row only). */
export const load: PageServerLoad = async (event) => {
	const { user } = await requireParent(event);
	event.depends('app:billing');
	const { data: sub } = await event.locals.supabase
		.from('subscriptions')
		.select('status, plan, current_period_end')
		.eq('user_id', user.id)
		.maybeSingle();

	const checkout = event.url.searchParams.get('checkout');
	return {
		configured: stripeConfigured(),
		active: isActiveStatus(sub?.status),
		status: sub?.status ?? 'inactive',
		renews: sub?.current_period_end ?? null,
		checkout: checkout === 'success' || checkout === 'cancelled' ? checkout : null
	};
};
