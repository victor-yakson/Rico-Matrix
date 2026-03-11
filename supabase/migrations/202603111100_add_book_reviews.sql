create table if not exists public.book_reviews (
  id bigserial primary key,
  book_id text not null,
  reviewer_address text not null,
  sentiment text not null check (sentiment in ('like', 'dislike')),
  review_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_book_reviews_book_user_unique
on public.book_reviews(book_id, reviewer_address);

create index if not exists idx_book_reviews_book_created
on public.book_reviews(book_id, created_at desc);

drop trigger if exists trg_book_reviews_updated_at on public.book_reviews;
create trigger trg_book_reviews_updated_at
before update on public.book_reviews
for each row execute function public.update_updated_at_column();
