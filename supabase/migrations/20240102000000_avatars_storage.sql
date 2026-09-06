-- Set up Storage for Avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

-- Allow public access to avatars
create policy "Avatar images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- Allow users to upload their own avatar
create policy "Anyone can upload an avatar."
  on storage.objects for insert
  with check ( bucket_id = 'avatars' AND auth.uid() = owner );

-- Allow users to update their own avatar
create policy "Anyone can update their own avatar."
  on storage.objects for update
  using ( bucket_id = 'avatars' AND auth.uid() = owner );
