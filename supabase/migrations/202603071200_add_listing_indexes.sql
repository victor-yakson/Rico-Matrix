create unique index if not exists idx_books_tx_hash_unique
on public.books(tx_hash)
where tx_hash is not null;

create index if not exists idx_books_status_updated_at
on public.books(status, updated_at desc);
