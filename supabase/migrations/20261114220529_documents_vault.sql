-- documents_vault (Member 1, P2)
--  * kinds: parenting_plan | court_order | school | medical | insurance | id_travel | receipt | other
--  * documents are records: no delete (already), and parents may update ONLY the
--    `extracted` column (used by the AI plan import); title/kind/path can't change.

update public.documents set kind = 'court_order' where kind = 'legal';
alter table public.documents drop constraint if exists documents_kind_check;
alter table public.documents add constraint documents_kind_check check (
	kind in ('parenting_plan', 'court_order', 'school', 'medical', 'insurance', 'id_travel', 'receipt', 'other')
);

-- Column-level grant: the existing update policy stays, but only `extracted` is updatable.
revoke update on public.documents from authenticated;
grant update (extracted) on public.documents to authenticated;

create index if not exists documents_family_kind_idx on public.documents (family_id, kind, created_at desc);
