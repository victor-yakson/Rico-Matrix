import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  createPublicClient,
  decodeFunctionData,
  http,
  parseAbiItem,
} from "viem";

const rpcUrl = process.env.RPC_URL || process.env.NEXT_PUBLIC_BSC_RPC_URL || "";
const contractAddress =
  process.env.CONTRACT_ADDRESS ||
  process.env.LIBRARY_CONTRACT_ADDRESS ||
  process.env.NEXT_PUBLIC_LIBRARY_CONTRACT_ADDRESS ||
  "";
const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const gateway = (
  process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs"
).replace(/\/+$/, "");
const pinataJwt = process.env.PINATA_JWT || "";

if (!rpcUrl) throw new Error("Missing RPC_URL (or NEXT_PUBLIC_BSC_RPC_URL).");
if (!contractAddress) {
  throw new Error(
    "Missing CONTRACT_ADDRESS/LIBRARY_CONTRACT_ADDRESS/NEXT_PUBLIC_LIBRARY_CONTRACT_ADDRESS."
  );
}
if (!supabaseUrl) throw new Error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL).");
if (!supabaseKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");

const publicClient = createPublicClient({ transport: http(rpcUrl) });
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const bookListedEvent = parseAbiItem(
  "event BookListed(uint256 indexed bookId, address indexed author, uint256 price)"
);
const listBookFn = parseAbiItem(
  "function listBook(string cid, uint256 price, address customPayoutWallet)"
);

const parseArg = (name, fallback) => {
  const item = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!item) return fallback;
  const value = item.split("=", 2)[1];
  return value || fallback;
};

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const fetchMetadata = async (cid) => {
  const res = await fetch(`${gateway}/${cid}/metadata.json`, {
    headers: pinataJwt ? { Authorization: `Bearer ${pinataJwt}` } : undefined,
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
};

const toText = (value) => (typeof value === "string" ? value : "");

const main = async () => {
  const latest = await publicClient.getBlockNumber();
  const fromBlock = BigInt(parseArg("from", "0"));
  const toBlock = BigInt(parseArg("to", latest.toString()));
  const batchSize = BigInt(parseArg("batch", "1500"));

  if (fromBlock > toBlock) {
    throw new Error(`Invalid range: from (${fromBlock}) > to (${toBlock}).`);
  }
  if (batchSize <= 0n) {
    throw new Error("batch must be > 0.");
  }

  let scannedLogs = 0;
  let upserted = 0;
  let skipped = 0;
  let failures = 0;

  let start = fromBlock;
  while (start <= toBlock) {
    const end = start + batchSize - 1n > toBlock ? toBlock : start + batchSize - 1n;
    const logs = await publicClient.getLogs({
      address: contractAddress,
      event: bookListedEvent,
      fromBlock: start,
      toBlock: end,
    });

    for (const log of logs) {
      scannedLogs += 1;
      const txHash = log.transactionHash;
      const args = log.args || {};

      try {
        const tx = await publicClient.getTransaction({ hash: txHash });
        const decoded = decodeFunctionData({
          abi: [listBookFn],
          data: tx.input,
        });
        if (decoded.functionName !== "listBook") {
          skipped += 1;
          continue;
        }

        const [cid] = decoded.args;
        if (typeof cid !== "string" || !cid) {
          skipped += 1;
          continue;
        }

        const metadata = await fetchMetadata(cid);
        const title =
          toText(metadata?.title) || toText(metadata?.name) || null;
        const description = toText(metadata?.description) || null;
        const fingerprint =
          toText(metadata?.content_fingerprint) ||
          toText(metadata?.contentFingerprint) ||
          sha256(
            metadata ? JSON.stringify(metadata) : `${args.bookId ?? ""}:${cid}`
          );

        const row = {
          book_id: args.bookId ? args.bookId.toString() : null,
          author_address:
            typeof args.author === "string" ? args.author : tx.from,
          price: args.price ? args.price.toString() : null,
          title,
          description,
          status: "listed",
          cid,
          content_fingerprint: fingerprint,
          tx_hash: txHash,
        };

        const { error } = await supabase
          .from("books")
          .upsert([row], { onConflict: "cid" });
        if (error) throw error;
        upserted += 1;
      } catch (error) {
        failures += 1;
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[backfill] failed tx=${txHash}: ${message}`);
      }
    }

    console.log(
      `[backfill] blocks ${start}..${end} | logs=${logs.length} | upserted=${upserted} skipped=${skipped} failed=${failures}`
    );
    start = end + 1n;
  }

  console.log(
    `[backfill] complete | scannedLogs=${scannedLogs} upserted=${upserted} skipped=${skipped} failed=${failures}`
  );
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[backfill] fatal: ${message}`);
  process.exit(1);
});
