/**
 * Shared `use:enhance` handler for the swap forms (they post to
 * /calendar/swap?/… from Today and the Calendar). Keeps the user on the
 * current page, shows a toast, and refreshes Today + Calendar data.
 */
import type { SubmitFunction } from '$app/forms';
import { goto, invalidate } from '$app/navigation';
import { toast } from 'svelte-sonner';

export function swapSubmit(
	opts: {
		setPending?: (pending: boolean) => void;
		onSuccess?: () => void;
		onFailure?: (message: string) => void;
	} = {}
): SubmitFunction {
	return () => {
		opts.setPending?.(true);
		return async ({ result }) => {
			opts.setPending?.(false);
			if (result.type === 'success') {
				toast.success(String(result.data?.message ?? 'Done'));
				opts.onSuccess?.();
				await Promise.all([invalidate('app:today'), invalidate('app:calendar')]);
			} else if (result.type === 'failure') {
				const message = String(result.data?.message ?? 'Something went wrong. Please try again.');
				if (opts.onFailure) opts.onFailure(message);
				else toast.error(message);
			} else if (result.type === 'redirect') {
				await goto(result.location);
			} else {
				toast.error(result.error?.message ?? 'Something went wrong. Please try again.');
			}
		};
	};
}
