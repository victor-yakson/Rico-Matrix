create table if not exists public.visitors (
  id bigserial primary key,
  visitor_id text not null,
  country_code text not null default 'XX',
  country_name text not null default 'Unknown',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'visitors_visitor_id_key'
      and conrelid = 'public.visitors'::regclass
  ) then
    alter table public.visitors
      add constraint visitors_visitor_id_key unique (visitor_id);
  end if;
end $$;

create index if not exists idx_visitors_country_code
  on public.visitors(country_code);

create index if not exists idx_visitors_country_name
  on public.visitors(country_name);

drop trigger if exists trg_visitors_updated_at on public.visitors;
create trigger trg_visitors_updated_at
before update on public.visitors
for each row execute function public.update_updated_at_column();

create or replace view public.visitor_country_stats as
select
  country_code,
  country_name,
  count(*)::bigint as unique_visitors
from public.visitors
where country_code <> 'XX'
  and country_name <> 'Unknown'
group by country_code, country_name;

create or replace view public.visitor_summary_stats as
select
  count(*)::bigint as unique_visitors,
  count(distinct country_code)::bigint as countries
from public.visitors
where country_code <> 'XX'
  and country_name <> 'Unknown';
