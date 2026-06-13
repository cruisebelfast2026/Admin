-- ============================================================================
-- Storage bucket for shuttle signage PDFs (Build Brief Section 14.6)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('signage', 'signage', false)
on conflict (id) do nothing;

-- Authenticated admins can read/write signage objects.
drop policy if exists "signage_authenticated" on storage.objects;
create policy "signage_authenticated"
  on storage.objects for all to authenticated
  using (bucket_id = 'signage')
  with check (bucket_id = 'signage');
