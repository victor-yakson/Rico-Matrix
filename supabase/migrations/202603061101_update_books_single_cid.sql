create extension if not exists vector;

create table if not exists public.books (
  id bigserial primary key,
  book_id text unique,
  author_address text not null,
  price text,
  title text,
  description text,
  status text not null default 'approved',
  cid text not null unique,
  content_fingerprint text not null,
  tx_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.books
  alter column book_id drop not null;

alter table public.books
  alter column price drop not null;

alter table public.books
  add column if not exists title text;

alter table public.books
  add column if not exists description text;

alter table public.books
  add column if not exists status text not null default 'approved';

alter table public.books
  add column if not exists cid text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'books'
      and column_name = 'metadata_cid'
  ) then
    execute '
      update public.books
      set cid = metadata_cid
      where cid is null
        and metadata_cid is not null
    ';
  end if;
end $$;

alter table public.books
  alter column cid set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'books_cid_key'
      and conrelid = 'public.books'::regclass
  ) then
    alter table public.books add constraint books_cid_key unique (cid);
  end if;
end $$;

alter table public.books
  drop column if exists metadata_cid;

alter table public.books
  drop column if exists content_cid;

create index if not exists idx_books_status on public.books(status);

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_books_updated_at on public.books;
create trigger trg_books_updated_at
before update on public.books
for each row execute function public.update_updated_at_column();
