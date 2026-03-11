alter table if exists public.books
  add column if not exists payout_wallet text,
  add column if not exists onchain_price text,
  add column if not exists last_action_type text,
  add column if not exists last_action_tx_hash text,
  add column if not exists last_update_ipfs_cid text;

create index if not exists idx_books_book_id on public.books(book_id);
create index if not exists idx_books_last_action_type on public.books(last_action_type);
