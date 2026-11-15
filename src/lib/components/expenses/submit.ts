import type { SubmitFunction } from '$app/forms';
import { toast } from 'svelte-sonner';

/**
 * use:enhance helper for the expenses page: toast on success, show the
 * server's message on failure, re-run load (live data) either way.
 */
export function withToast(
	success: string | ((data: Record<string, unknown> | undefined) => string),
	opts: {
		onSuccess?: () => void;
		onError?: (message: string) => void;
		busy?: (b: boolean) => void;
	} = {}
): SubmitFunction {
	return () => {
		opts.busy?.(true);
		return async ({ result, update }) => {
			opts.busy?.(false);
			if (result.type === 'success') {
				toast.success(typeof success === 'function' ? success(result.data) : success);
				opts.onSuccess?.();
				await update({ reset: false });
			} else if (result.type === 'failure') {
				const message = String(result.data?.message ?? 'Something went wrong.');
				if (opts.onError) opts.onError(message);
				else toast.error(message);
			} else {
				await update();
			}
		};
	};
}

export const selectClass =
	'h-9 w-full rounded-lg border border-input bg-background px-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none';
