-- Add phone column to profiles and supportive indexes for search
alter table public.profiles add column if not exists phone text;

-- Optional indexes to speed up email/phone search (case-insensitive searches still benefit)
create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists profiles_phone_idx on public.profiles (phone);

