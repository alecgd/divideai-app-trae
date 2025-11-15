-- Friends feature schema and RLS
-- Create profiles if not exists (basic public profile for search)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  created_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

-- Policies: allow authenticated users to read minimal profile info for discovery
drop policy if exists "Profiles are readable by authenticated" on public.profiles;
create policy "Profiles are readable by authenticated"
  on public.profiles
  for select
  to authenticated
  using (true);

-- Only owner can insert/update their profile
drop policy if exists "Profiles insert by owner" on public.profiles;
create policy "Profiles insert by owner"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Profiles update by owner" on public.profiles;
create policy "Profiles update by owner"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Friend requests table
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamp with time zone default now()
);

alter table public.friend_requests enable row level security;

create index if not exists friend_requests_to_idx on public.friend_requests (to_user_id, status);
create index if not exists friend_requests_from_idx on public.friend_requests (from_user_id, status);

-- Requests policies
drop policy if exists "Request insert by sender" on public.friend_requests;
create policy "Request insert by sender"
  on public.friend_requests
  for insert
  to authenticated
  with check (
    auth.uid() = from_user_id and from_user_id <> to_user_id
  );

drop policy if exists "Request select by participants" on public.friend_requests;
create policy "Request select by participants"
  on public.friend_requests
  for select
  to authenticated
  using (
    auth.uid() = from_user_id or auth.uid() = to_user_id
  );

-- Allow the receiver to update status (accept/decline) of pending requests
drop policy if exists "Request update by receiver" on public.friend_requests;
create policy "Request update by receiver"
  on public.friend_requests
  for update
  to authenticated
  using (
    auth.uid() = to_user_id and status = 'pending'
  )
  with check (
    auth.uid() = to_user_id and status in ('accepted','declined')
  );

-- Optional: allow sender to cancel (set declined) while pending
drop policy if exists "Request cancel by sender" on public.friend_requests;
create policy "Request cancel by sender"
  on public.friend_requests
  for update
  to authenticated
  using (
    auth.uid() = from_user_id and status = 'pending'
  )
  with check (
    auth.uid() = from_user_id and status = 'declined'
  );

-- Friends table (undirected pair)
create table if not exists public.friends (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references auth.users(id) on delete cascade,
  user_b_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  constraint friends_distinct_pair check (user_a_id <> user_b_id)
);

alter table public.friends enable row level security;

-- Unique undirected pair using expression index
create unique index if not exists friends_unique_pair on public.friends ((LEAST(user_a_id, user_b_id)), (GREATEST(user_a_id, user_b_id)));

-- Friends policies
drop policy if exists "Friends select for participants" on public.friends;
create policy "Friends select for participants"
  on public.friends
  for select
  to authenticated
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);

drop policy if exists "Friends insert by participants" on public.friends;
create policy "Friends insert by participants"
  on public.friends
  for insert
  to authenticated
  with check (auth.uid() = user_a_id or auth.uid() = user_b_id);

drop policy if exists "Friends delete by participants" on public.friends;
create policy "Friends delete by participants"
  on public.friends
  for delete
  to authenticated
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);
