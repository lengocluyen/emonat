-- Emonat server schema (Postgres)
-- Run with: psql "$DATABASE_URL" -f server/db/schema.sql

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  full_name text null,
  phone text null,
  birthday date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Boards: user can have multiple contexts (work/home/school)
create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_boards_owner_name on public.boards(owner_user_id, name);
create unique index if not exists idx_boards_one_default_per_owner on public.boards(owner_user_id) where is_default;

-- Columns: groups inside a board (planning/doing/done)
create table if not exists public.board_columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  name text not null,
  description text null,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_board_columns_board_name on public.board_columns(board_id, name);
create index if not exists idx_board_columns_board_order on public.board_columns(board_id, order_index);

-- Backfill/upgrade existing installs (idempotent)
alter table public.users add column if not exists full_name text null;
alter table public.users add column if not exists phone text null;
alter table public.users add column if not exists birthday date null;
alter table public.users add column if not exists updated_at timestamptz not null default now();

alter table public.board_columns add column if not exists description text null;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,

  -- New model (boards -> columns -> tasks). Kept nullable for backward compatibility.
  board_id uuid null references public.boards(id) on delete cascade,
  column_id uuid null references public.board_columns(id) on delete restrict,
  order_index int not null default 0,

  title text not null,
  description text null,
  -- Legacy status (kept for backwards compatibility; prefer column_id for grouping)
  status text not null default 'planning',
  due_date date null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Allow custom columns beyond planning/doing/done by removing the old CHECK constraint.
-- The auto-generated name for the unnamed check is typically tasks_status_check.
alter table public.tasks drop constraint if exists tasks_status_check;

-- Backfill/upgrade existing installs (idempotent)
alter table public.tasks add column if not exists board_id uuid null references public.boards(id) on delete cascade;
alter table public.tasks add column if not exists column_id uuid null references public.board_columns(id) on delete restrict;
alter table public.tasks add column if not exists order_index int not null default 0;

create index if not exists idx_tasks_user_id on public.tasks(user_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_board_id on public.tasks(board_id);
create index if not exists idx_tasks_column_id on public.tasks(column_id);

-- Graph edges between tasks (board-level relationships)
create table if not exists public.task_links (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  from_task_id uuid not null references public.tasks(id) on delete cascade,
  to_task_id uuid not null references public.tasks(id) on delete cascade,
  kind text not null check (kind in ('dependency','reference')),
  created_at timestamptz not null default now()
);

create unique index if not exists idx_task_links_unique on public.task_links(board_id, from_task_id, to_task_id, kind);
create index if not exists idx_task_links_board on public.task_links(board_id);

create table if not exists public.task_graphs (
  task_id uuid primary key references public.tasks(id) on delete cascade,
  graph jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

drop trigger if exists trg_boards_updated_at on public.boards;
create trigger trg_boards_updated_at
before update on public.boards
for each row execute function public.set_updated_at();

drop trigger if exists trg_board_columns_updated_at on public.board_columns;
create trigger trg_board_columns_updated_at
before update on public.board_columns
for each row execute function public.set_updated_at();

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

-- Backfill defaults (idempotent)
-- 1) Ensure every user has a default board.
insert into public.boards (owner_user_id, name, is_default)
select u.id, 'My Board', true
from public.users u
where not exists (
  select 1 from public.boards b where b.owner_user_id = u.id and b.is_default
);

-- 2) Ensure default columns exist on each default board.
insert into public.board_columns (board_id, name, order_index)
select b.id, v.name, v.order_index
from public.boards b
cross join (
  values
    ('planning', 0),
    ('doing', 1),
    ('done', 2)
) as v(name, order_index)
where b.is_default
  and not exists (
    select 1 from public.board_columns c where c.board_id = b.id and c.name = v.name
  );

-- 3) Attach existing tasks to the user's default board.
update public.tasks t
set board_id = b.id
from public.boards b
where t.board_id is null
  and b.owner_user_id = t.user_id
  and b.is_default;

-- 4) Attach existing tasks to a column based on legacy status.
update public.tasks t
set column_id = c.id
from public.board_columns c
where t.column_id is null
  and t.board_id = c.board_id
  and c.name = t.status;

-- 5) Any remaining tasks go to planning.
update public.tasks t
set column_id = c.id
from public.board_columns c
where t.column_id is null
  and t.board_id = c.board_id
  and c.name = 'planning';
