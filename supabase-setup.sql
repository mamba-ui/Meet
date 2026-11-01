-- Run in Supabase > SQL Editor. Skip any block you already have.

-- 1) Profiles: one row per signed-up user, created automatically on sign-up
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
drop policy if exists "signed-in users can read profiles" on public.profiles;
create policy "signed-in users can read profiles" on public.profiles
  for select to authenticated using (true);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) Friendships (pending request -> accepted)
create table if not exists public.friendships (
  id bigint generated always as identity primary key,
  requester uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  addressee uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz default now(),
  check (requester <> addressee)
);
create unique index if not exists friendships_pair
  on public.friendships (least(requester, addressee), greatest(requester, addressee));

alter table public.friendships enable row level security;
create policy "see own friendships" on public.friendships
  for select to authenticated using (auth.uid() in (requester, addressee));
create policy "send a request" on public.friendships
  for insert to authenticated with check (requester = auth.uid() and status = 'pending');
create policy "accept a request" on public.friendships
  for update to authenticated using (addressee = auth.uid()) with check (addressee = auth.uid());
create policy "remove or cancel" on public.friendships
  for delete to authenticated using (auth.uid() in (requester, addressee));

alter publication supabase_realtime add table public.friendships;

-- 3) Messages: only allow sending to accepted friends (enforced in the database)
create policy "chat only with friends" on public.messages
  as restrictive for insert to authenticated
  with check (exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester = auth.uid() and f.addressee = receiver)
        or (f.addressee = auth.uid() and f.requester = receiver))
  ));
