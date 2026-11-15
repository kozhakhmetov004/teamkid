<script lang="ts">
	/**
	 * Balance + "Settle up": one payment for the whole balance (every approved
	 * expense is then marked reimbursed), or a partial payment that lowers it.
	 * The app records payments; it never moves money. The receiver can confirm.
	 */
	import { enhance } from '$app/forms';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { formatCents } from '#lib/expenses/money.js';
	import { selectClass, withToast } from './submit.js';
	import type { SettlementView } from './types.js';

	let {
		text,
		items,
		iOweCents,
		otherName,
		settlements,
		methods
	}: {
		text: string;
		items: number;
		iOweCents: number;
		otherName: string;
		settlements: SettlementView[];
		methods: string[];
	} = $props();

	const METHOD_LABEL: Record<string, string> = {
		zelle: 'Zelle',
		venmo: 'Venmo',
		paypal: 'PayPal',
		cash: 'Cash',
		check: 'Check',
		bank: 'Bank transfer',
		other: 'Other'
	};

	let open = $state(false);
	let busy = $state(false);
	let error = $state<string | null>(null);
	let amount = $state('');

	function settle() {
		error = null;
		amount = (iOweCents / 100).toFixed(2);
		open = true;
	}
</script>

<Card.Root class="h-full" id="balance">
	<Card.Header>
		<Card.Title>Balance</Card.Title>
		<Card.Description>From approved expenses that aren’t paid back yet</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-4">
		<div>
			<p class="text-2xl font-bold">{text}</p>
			<p class="text-sm text-muted-foreground">
				{items === 0 ? 'Nothing open' : `${items} open expense${items === 1 ? '' : 's'}`}
			</p>
		</div>
		{#if iOweCents > 0}
			<Button onclick={settle}>Settle up</Button>
		{/if}

		{#if settlements.length}
			<div class="space-y-2">
				<p class="text-sm font-medium">Recent payments</p>
				<ul class="space-y-2 text-sm">
					{#each settlements as s (s.id)}
						<li class="flex flex-wrap items-center justify-between gap-2">
							<span>
								{s.paidByMe ? `You paid ${otherName}` : `${s.from} paid you`}
								<strong>{s.amount}</strong>
								<span class="text-muted-foreground"
									>· {s.method} · {s.whenLabel}{s.kind === 'partial' ? ' · partial' : ''}</span
								>
								{#if s.note}<span class="block text-xs text-muted-foreground">“{s.note}”</span>{/if}
							</span>
							{#if s.confirmed}
								<span class="text-xs text-emerald-700 dark:text-emerald-300">✓ Received</span>
							{:else if s.canConfirm}
								<form
									method="POST"
									action="?/confirmSettlement"
									use:enhance={withToast('Thanks, marked as received')}
								>
									<input type="hidden" name="id" value={s.id} />
									<Button type="submit" size="sm" variant="outline">I got it</Button>
								</form>
							{:else}
								<span class="text-xs text-muted-foreground">Not confirmed yet</span>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</Card.Content>
</Card.Root>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Settle up with {otherName}</Dialog.Title>
			<Dialog.Description>
				Pay {otherName} the way you usually do, then record it here. TeamKid doesn’t move money.
			</Dialog.Description>
		</Dialog.Header>
		<form
			method="POST"
			action="?/settle"
			class="grid gap-3"
			use:enhance={withToast(
				(d) => (d?.kind === 'full' ? 'All settled ✓' : 'Payment recorded. The balance is lower.'),
				{ busy: (b) => (busy = b), onSuccess: () => (open = false), onError: (m) => (error = m) }
			)}
		>
			<div class="space-y-1">
				<Label for="st-amount">Amount ($)</Label>
				<Input id="st-amount" name="amount" inputmode="decimal" required bind:value={amount} />
				<p class="text-xs text-muted-foreground">
					The full {formatCents(iOweCents)} settles every open expense. A smaller amount is recorded as
					a partial payment.
				</p>
			</div>
			<div class="space-y-1">
				<Label for="st-method">How did you pay?</Label>
				<select id="st-method" name="method" class={selectClass} value="zelle">
					{#each methods as m (m)}<option value={m}>{METHOD_LABEL[m] ?? m}</option>{/each}
				</select>
			</div>
			<div class="space-y-1">
				<Label for="st-note">Note (optional)</Label>
				<Input id="st-note" name="note" maxlength={140} placeholder="Sent Friday evening" />
			</div>
			{#if error}<p role="alert" class="text-sm text-destructive">{error}</p>{/if}
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
				<Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Record payment'}</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
