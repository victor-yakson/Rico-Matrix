import "server-only";

export type SupabaseBookRow = {
  id?: number;
  book_id: string | null;
  author_address: string;
  price: string | null;
  payout_wallet?: string | null;
  onchain_price?: string | null;
  last_action_type?: string | null;
  last_action_tx_hash?: string | null;
  last_update_ipfs_cid?: string | null;
  title?: string | null;
  description?: string | null;
  status?: "approved" | "listed" | "listing_submitted";
  cid: string;
  content_fingerprint: string;
  tx_hash?: string | null;
  created_at?: string;
  updated_at?: string;
};

const BOOK_SELECT_COLUMNS =
  "id,book_id,author_address,price,payout_wallet,onchain_price,last_action_type,last_action_tx_hash,last_update_ipfs_cid,title,description,status,cid,content_fingerprint,tx_hash,created_at,updated_at";

export type SupabaseBookReviewRow = {
  id?: number;
  book_id: string;
  reviewer_address: string;
  sentiment: "like" | "dislike";
  review_text?: string | null;
  created_at?: string;
  updated_at?: string;
};

const getSupabaseConfig = () => {
  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    "";

  if (!url) {
    throw new Error("SUPABASE_URL is not configured.");
  }
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }

  return { url, serviceRoleKey };
};

type SupabaseClientLike = {
  from: (table: string) => {
    select: (columns: string) => any;
    upsert: (values: Record<string, unknown>[], options?: Record<string, unknown>) => any;
    update: (values: Record<string, unknown>) => any;
  };
};

let clientPromise: Promise<SupabaseClientLike> | null = null;

const getClient = async (): Promise<SupabaseClientLike> => {
  if (clientPromise) return clientPromise;

  clientPromise = (async () => {
    const { url, serviceRoleKey } = getSupabaseConfig();
    try {
      const mod = await import("@supabase/supabase-js");
      return mod.createClient(url, serviceRoleKey, {
        auth: { persistSession: false },
      }) as unknown as SupabaseClientLike;
    } catch {
      throw new Error(
        'Missing "@supabase/supabase-js". Install it with: npm i @supabase/supabase-js'
      );
    }
  })();

  return clientPromise;
};

export const findBookByFingerprint = async (fingerprint: string) => {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from("books")
    .select("book_id,content_fingerprint")
    .eq("content_fingerprint", fingerprint)
    .limit(1);

  if (error) {
    throw new Error(error.message || "Supabase query failed.");
  }

  return ((data as SupabaseBookRow[] | null) || [])[0] ?? null;
};

export const upsertBook = async (book: SupabaseBookRow) => {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from("books")
    .upsert([book], { onConflict: "cid" })
    .select(
      BOOK_SELECT_COLUMNS
    );

  if (error) {
    throw new Error(error.message || "Supabase upsert failed.");
  }

  return ((data as SupabaseBookRow[] | null) || [])[0] ?? null;
};

export const getBookByBookId = async (bookId: string) => {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from("books")
    .select(
      BOOK_SELECT_COLUMNS
    )
    .eq("book_id", bookId)
    .limit(1);

  if (error) {
    throw new Error(error.message || "Supabase query failed.");
  }

  return ((data as SupabaseBookRow[] | null) || [])[0] ?? null;
};

export const getBookByRecordId = async (id: number) => {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from("books")
    .select(
      BOOK_SELECT_COLUMNS
    )
    .eq("id", id)
    .limit(1);

  if (error) {
    throw new Error(error.message || "Supabase query failed.");
  }

  return ((data as SupabaseBookRow[] | null) || [])[0] ?? null;
};

export const createUploadedBook = async (input: {
  author_address: string;
  title: string;
  description: string;
  cid: string;
  content_fingerprint: string;
}) => {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from("books")
    .upsert(
      [
        {
          author_address: input.author_address,
          payout_wallet: input.author_address,
          title: input.title,
          description: input.description,
          status: "approved",
          cid: input.cid,
          content_fingerprint: input.content_fingerprint,
        },
      ],
      { onConflict: "cid" }
    )
    .select(
      BOOK_SELECT_COLUMNS
    );

  if (error) {
    throw new Error(error.message || "Supabase insert failed.");
  }

  return ((data as SupabaseBookRow[] | null) || [])[0] ?? null;
};

export const listBooks = async (limit = 24, offset = 0) => {
  const supabase = await getClient();
  const from = Math.max(0, offset);
  const to = from + Math.max(1, limit) - 1;

  const { data, error } = await supabase
    .from("books")
    .select(
      BOOK_SELECT_COLUMNS
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(error.message || "Supabase query failed.");
  }

  return (data as SupabaseBookRow[] | null) || [];
};

export const listBooksByAuthor = async (
  authorAddress: string,
  limit = 24,
  offset = 0
) => {
  const supabase = await getClient();
  const from = Math.max(0, offset);
  const to = from + Math.max(1, limit) - 1;

  const { data, error } = await supabase
    .from("books")
    .select(
      BOOK_SELECT_COLUMNS
    )
    .eq("author_address", authorAddress)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(error.message || "Supabase query failed.");
  }

  return (data as SupabaseBookRow[] | null) || [];
};

export const listBooksByAuthorAndStatus = async (
  authorAddress: string,
  status: NonNullable<SupabaseBookRow["status"]>,
  limit = 24,
  offset = 0
) => {
  const supabase = await getClient();
  const from = Math.max(0, offset);
  const to = from + Math.max(1, limit) - 1;

  const { data, error } = await supabase
    .from("books")
    .select(
      BOOK_SELECT_COLUMNS
    )
    .eq("author_address", authorAddress)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(error.message || "Supabase query failed.");
  }

  return (data as SupabaseBookRow[] | null) || [];
};

export const listBooksByStatus = async (
  status: NonNullable<SupabaseBookRow["status"]>,
  limit = 100,
  offset = 0
) => {
  const supabase = await getClient();
  const from = Math.max(0, offset);
  const to = from + Math.max(1, limit) - 1;

  const { data, error } = await supabase
    .from("books")
    .select(
      BOOK_SELECT_COLUMNS
    )
    .eq("status", status)
    .order("updated_at", { ascending: true })
    .range(from, to);

  if (error) {
    throw new Error(error.message || "Supabase query failed.");
  }

  return (data as SupabaseBookRow[] | null) || [];
};

export const updateBookByRecordId = async (
  id: number,
  data: Partial<
    Pick<
      SupabaseBookRow,
      | "book_id"
      | "price"
      | "status"
      | "tx_hash"
      | "title"
      | "description"
      | "payout_wallet"
      | "onchain_price"
      | "last_action_type"
      | "last_action_tx_hash"
      | "last_update_ipfs_cid"
    >
  >
) => {
  const supabase = await getClient();
  const { data: rows, error } = await supabase
    .from("books")
    .update(data)
    .eq("id", id)
    .select(
      BOOK_SELECT_COLUMNS
    )
    .limit(1);

  if (error) {
    throw new Error(error.message || "Supabase update failed.");
  }

  return ((rows as SupabaseBookRow[] | null) || [])[0] ?? null;
};

export const listBookReviews = async (bookId: string, limit = 100, offset = 0) => {
  const supabase = await getClient();
  const from = Math.max(0, offset);
  const to = from + Math.max(1, limit) - 1;

  const { data, error } = await supabase
    .from("book_reviews")
    .select(
      "id,book_id,reviewer_address,sentiment,review_text,created_at,updated_at"
    )
    .eq("book_id", bookId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(error.message || "Supabase query failed.");
  }

  return (data as SupabaseBookReviewRow[] | null) || [];
};

export const upsertBookReview = async (input: {
  book_id: string;
  reviewer_address: string;
  sentiment: "like" | "dislike";
  review_text?: string | null;
}) => {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from("book_reviews")
    .upsert([input], { onConflict: "book_id,reviewer_address" })
    .select(
      "id,book_id,reviewer_address,sentiment,review_text,created_at,updated_at"
    );

  if (error) {
    throw new Error(error.message || "Supabase upsert failed.");
  }

  return ((data as SupabaseBookReviewRow[] | null) || [])[0] ?? null;
};
