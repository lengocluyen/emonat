-- Emonat / NeuroTask: Supabase schema (Phase: Task Board + Auth)
-- Run this in Supabase SQL Editor.
--
-- Requirements:
-- - Supabase project with Auth enabled
-- - Extensions: pgcrypto (for gen_random_uuid)

create extension if not exists pgcrypto;

-- Helper trigger to keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Tasks table (card-style task list)
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  title text not null,
  description text null,
  status text not null default 'planning' check (status in ('planning', 'doing', 'done')),
  due_date date null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

-- Indexes
create index if not exists idx_tasks_user_id on public.tasks (user_id);
create index if not exists idx_tasks_status on public.tasks (status);

-- Row Level Security
alter table public.tasks enable row level security;

-- Policies: a user can only see and mutate their own tasks
drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own"
  on public.tasks
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own"
  on public.tasks
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own"
  on public.tasks
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own"
  on public.tasks
  for delete
  to authenticated
  using (user_id = auth.uid());
