-- documents_storage.sql
-- Private Storage bucket for family documents (parenting plans, medical, school).
-- Files live at {family_id}/{uuid}.{ext}; only parents of that family may upload
-- or read them. No update/delete policies: documents are records (like the
-- documents table, which has no delete policy either).
-- Endpoints may be stricter than the bucket (e.g. parse-plan accepts PDF only).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
	'documents',
	'documents',
	false,
	10485760, -- 10 MB
	array['application/pdf', 'image/png', 'image/jpeg']
)
on conflict (id) do update
	set public = false,
		file_size_limit = excluded.file_size_limit,
		allowed_mime_types = excluded.allowed_mime_types;

-- family_id from the first folder of an object path, or null for any other
-- shape (no folder, not a uuid), so policies never fail on a bad cast.
create or replace function public.storage_family_id(object_name text)
returns uuid
language sql
immutable
set search_path = public
as $$
	select case
		when object_name like '%/%'
			and split_part(object_name, '/', 1)
				~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
		then split_part(object_name, '/', 1)::uuid
	end;
$$;

revoke execute on function public.storage_family_id(text) from public, anon;
grant execute on function public.storage_family_id(text) to authenticated, service_role;

-- is_family_parent(null) is false, so malformed paths are denied.
create policy documents_bucket_select_parent on storage.objects
	for select to authenticated
	using (bucket_id = 'documents' and public.is_family_parent(public.storage_family_id(name)));

create policy documents_bucket_insert_parent on storage.objects
	for insert to authenticated
	with check (bucket_id = 'documents' and public.is_family_parent(public.storage_family_id(name)));
