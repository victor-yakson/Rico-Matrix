import "server-only";

import {
  createPublicClient,
  decodeEventLog,
  decodeFunctionData,
  formatUnits,
  http,
  type Hex,
} from "viem";

import { CONTRACT_ABI, CONTRACT_ADDRESS } from "@/utils/constants";

export type MatrixAlertAction =
  | "registration"
  | "chapter-upgrade"
  | "royalty-claim";

type SupportedFunctionName =
  | "joinLibrary"
  | "buyNewChapter"
  | "claimRoyalty"
  | "claimRoyaltyV2"
  | "claimLegacyRoyalty";

type AlertBuildResult = {
  message: string;
  dedupeKey: string;
};

type ReaderSummary = {
  referrer: Hex;
  track1Unlocked: bigint;
  track2Unlocked: bigint;
  royaltyPercent: bigint;
};

const DEFAULT_CHANNEL = "@rico_update";
const USDT_DECIMALS = 18;
const BSC_TX_BASE_URL = "https://bscscan.com/tx/";
const CACHE_TTL_MS = 1000 * 60 * 60 * 6;

const chapterTierLabels: Record<number, string> = {
  1: "Genesis Access",
  2: "Builder Access",
  3: "Momentum Access",
  4: "Gold Access",
  5: "Diamond Access",
  6: "Sapphire Access",
  7: "Emerald Access",
  8: "Titanium Access",
  9: "Platinum Access",
  10: "Elite Access",
  11: "Legacy Access",
  12: "Crown Access",
};

declare global {
  // eslint-disable-next-line no-var
  var __ricoTelegramAlertCache:
    | Map<string, number>
    | undefined;
}

function getCache() {
  if (!globalThis.__ricoTelegramAlertCache) {
    globalThis.__ricoTelegramAlertCache = new Map<string, number>();
  }

  return globalThis.__ricoTelegramAlertCache;
}

function cleanupCache(cache: Map<string, number>) {
  const now = Date.now();
  for (const [key, timestamp] of cache.entries()) {
    if (now - timestamp > CACHE_TTL_MS) {
      cache.delete(key);
    }
  }
}

function getRpcUrl() {
  return (
    process.env.NEXT_PUBLIC_BSC_RPC_URL ||
    process.env.RPC_URL ||
    "https://bsc-dataseed.binance.org"
  );
}

function getPublicClient() {
  return createPublicClient({
    transport: http(getRpcUrl()),
  });
}

function getTelegramConfig() {
  return {
    botToken: process.env.TELEGRAM_BOT_TOKEN || "",
    channel: process.env.TELEGRAM_ALERT_CHANNEL_ID || DEFAULT_CHANNEL,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatUsdt(amount: bigint) {
  const numeric = Number.parseFloat(formatUnits(amount, USDT_DECIMALS));
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: numeric >= 1000 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

function formatRoyaltyPercent(percent: bigint) {
  const numeric = Number(percent);
  return numeric > 100 ? `${numeric / 100}%` : `${numeric}%`;
}

function getTierLabel(chapter: number) {
  return chapterTierLabels[chapter] || `Chapter ${chapter} Access`;
}

function getTrackLabel(track: number) {
  return track === 1 ? "X3 Matrix" : "X6 Matrix";
}

function getCurrentChapterLabel(summary: ReaderSummary) {
  const x3 = Number(summary.track1Unlocked || BigInt(0));
  const x6 = Number(summary.track2Unlocked || BigInt(0));
  return `X3 Chapter ${x3 || 1} • X6 Chapter ${x6 || 1}`;
}

function getTransactionUrl(hash: Hex) {
  return `${BSC_TX_BASE_URL}${hash}`;
}

function isSupportedFunctionName(
  functionName: string,
): functionName is SupportedFunctionName {
  return (
    functionName === "joinLibrary" ||
    functionName === "buyNewChapter" ||
    functionName === "claimRoyalty" ||
    functionName === "claimRoyaltyV2" ||
    functionName === "claimLegacyRoyalty"
  );
}

async function getVerifiedTransaction(hash: Hex) {
  const publicClient = getPublicClient();
  const [tx, receipt] = await Promise.all([
    publicClient.getTransaction({ hash }),
    publicClient.getTransactionReceipt({ hash }),
  ]);

  if (!tx.to || tx.to.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
    throw new Error("Transaction was not sent to the Rico Matrix contract.");
  }

  if (receipt.status !== "success") {
    throw new Error("Transaction did not complete successfully on-chain.");
  }

  const decoded = decodeFunctionData({
    abi: CONTRACT_ABI,
    data: tx.input,
  });

  if (!isSupportedFunctionName(decoded.functionName)) {
    throw new Error("Unsupported contract call for Telegram alerting.");
  }

  return {
    publicClient,
    tx,
    receipt,
    functionName: decoded.functionName,
    args: (decoded.args || []) as readonly unknown[],
  };
}

function decodeMatchingEvent<TArgs extends Record<string, unknown>>(
  eventName: string,
  logs: Array<{ data: Hex; topics: readonly Hex[] }>,
) {
  for (const log of logs) {
    try {
      const decoded = decodeEventLog({
        abi: CONTRACT_ABI,
        data: log.data,
        topics: log.topics as any,
        strict: false,
      });

      if (decoded.eventName === eventName) {
        return decoded.args as unknown as TArgs;
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function readReaderSummary(
  publicClient: ReturnType<typeof getPublicClient>,
  reader: Hex,
) {
  const summaryResult = (await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getReaderSummary",
    args: [reader],
  })) as {
    referrer: Hex;
    track1Unlocked: bigint;
    track2Unlocked: bigint;
    royaltyPercent: bigint;
  };

  return summaryResult;
}

async function readChapterPrice(
  publicClient: ReturnType<typeof getPublicClient>,
  chapter: number,
) {
  return (await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "chapterPrice",
    args: [chapter],
  })) as bigint;
}

async function buildRegistrationAlert(hash: Hex): Promise<AlertBuildResult> {
  const { publicClient, tx, receipt, functionName, args } =
    await getVerifiedTransaction(hash);

  if (functionName !== "joinLibrary") {
    throw new Error("Transaction is not a library registration.");
  }

  const joined = decodeMatchingEvent<{
    reader: Hex;
    referrer: Hex;
  }>("ReaderJoined", receipt.logs as Array<{ data: Hex; topics: readonly Hex[] }>);

  const referrerArg = args[0] as Hex | undefined;
  const reader = joined?.reader || tx.from;
  const referrer = joined?.referrer || referrerArg || "0x0000000000000000000000000000000000000000";
  const amountPaid = await readChapterPrice(publicClient, 1);

  const message = [
    "🥳 <b>NEW MEMBER JOINED THE MATRIX!</b>",
    "",
    `👤 <b>User:</b> <code>${escapeHtml(shortAddress(reader))}</code>`,
    `🧬 <b>Sponsor:</b> <code>${escapeHtml(shortAddress(referrer))}</code>`,
    "🏆 <b>Starting Chapter:</b> Chapter 1",
    `💳 <b>Amount Paid:</b> ${escapeHtml(formatUsdt(amountPaid))} USDT`,
    `🔗 <b>Tx Hash:</b> <a href="${escapeHtml(getTransactionUrl(hash))}">View Transaction</a>`,
    "",
    "⚡️ Welcome to the Rico Ecosystem! The matrix is expanding... 🚀",
  ].join("\n");

  return {
    message,
    dedupeKey: `registration:${hash}`,
  };
}

async function buildChapterUpgradeAlert(
  hash: Hex,
): Promise<AlertBuildResult> {
  const { tx, receipt, functionName, args } = await getVerifiedTransaction(hash);

  if (functionName !== "buyNewChapter") {
    throw new Error("Transaction is not a chapter purchase.");
  }

  const track = Number(args[0] as number | bigint);
  const chapter = Number(args[1] as number | bigint);
  const chapterPurchased = decodeMatchingEvent<{
    reader: Hex;
    track: number;
    chapter: number;
    price: bigint;
  }>("ChapterPurchased", receipt.logs as Array<{ data: Hex; topics: readonly Hex[] }>);

  const reader = chapterPurchased?.reader || tx.from;
  const contractValue = chapterPurchased?.price || BigInt(0);
  const trackLabel = getTrackLabel(track);
  const tierLabel = getTierLabel(chapter);

  const message = [
    "🚀 <b>CHAPTER UPGRADE UNLOCKED!</b>",
    "",
    `👤 <b>User:</b> <code>${escapeHtml(shortAddress(reader))}</code>`,
    `🧭 <b>Matrix Track:</b> ${escapeHtml(trackLabel)}`,
    `⬆️ <b>Upgraded To:</b> Chapter ${chapter}`,
    `💎 <b>New Tier:</b> ${escapeHtml(tierLabel)}`,
    `💰 <b>Contract Value:</b> ${escapeHtml(formatUsdt(contractValue))} USDT`,
    `🔗 <b>Tx Hash:</b> <a href="${escapeHtml(getTransactionUrl(hash))}">View Transaction</a>`,
    "",
    "🔮 Leveling up the matrix engine. Higher chapters, higher rewards! 🔥",
  ].join("\n");

  return {
    message,
    dedupeKey: `chapter-upgrade:${hash}`,
  };
}

async function buildRoyaltyClaimAlert(hash: Hex): Promise<AlertBuildResult> {
  const { publicClient, tx, receipt, functionName } =
    await getVerifiedTransaction(hash);

  const legacyClaim = decodeMatchingEvent<{
    reader: Hex;
    amount: bigint;
  }>("LegacyRoyaltyClaimed", receipt.logs as Array<{ data: Hex; topics: readonly Hex[] }>);

  const currentClaim = decodeMatchingEvent<{
    reader: Hex;
    amount: bigint;
  }>("RoyaltyClaimed", receipt.logs as Array<{ data: Hex; topics: readonly Hex[] }>);

  const reader = legacyClaim?.reader || currentClaim?.reader || tx.from;
  const amount =
    legacyClaim?.amount || currentClaim?.amount || BigInt(0);
  const summary = await readReaderSummary(publicClient, reader);

  const claimLabel =
    functionName === "claimLegacyRoyalty"
      ? "Legacy V1 Royalty"
      : functionName === "claimRoyaltyV2"
        ? "Fresh V2 Royalty"
        : "Current Royalty";

  const message = [
    "💸 <b>ROYALTY PAYOUT CLAIMED!</b>",
    "",
    `👤 <b>Claimant:</b> <code>${escapeHtml(shortAddress(reader))}</code>`,
    `👑 <b>Claim Type:</b> ${escapeHtml(claimLabel)}`,
    `📚 <b>Chapter Access:</b> ${escapeHtml(getCurrentChapterLabel(summary))}`,
    `📊 <b>Royalty Share:</b> ${escapeHtml(formatRoyaltyPercent(summary.royaltyPercent))}`,
    `💵 <b>Amount Claimed:</b> ${escapeHtml(formatUsdt(amount))} USDT`,
    `🔗 <b>Tx Hash:</b> <a href="${escapeHtml(getTransactionUrl(hash))}">View Transaction</a>`,
    "",
    "✨ Enjoy your royalty-powered passive income. Keep growing, keep earning! 👑",
  ].join("\n");

  return {
    message,
    dedupeKey: `royalty-claim:${hash}`,
  };
}

async function buildAlert(
  action: MatrixAlertAction,
  hash: Hex,
): Promise<AlertBuildResult> {
  switch (action) {
    case "registration":
      return buildRegistrationAlert(hash);
    case "chapter-upgrade":
      return buildChapterUpgradeAlert(hash);
    case "royalty-claim":
      return buildRoyaltyClaimAlert(hash);
    default:
      throw new Error("Unsupported alert action.");
  }
}

async function postTelegramMessage(message: string) {
  const { botToken, channel } = getTelegramConfig();

  if (!botToken) {
    throw new Error(
      "Missing TELEGRAM_BOT_TOKEN. Add the bot token to enable contract alerts.",
    );
  }

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: channel,
        text: `💎 <b>RICO Matrix Smart Contract Alerts</b>\n\n${message}`,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Telegram API rejected the alert (${response.status}): ${body}`,
    );
  }
}

export async function sendMatrixContractAlert(params: {
  action: MatrixAlertAction;
  txHash: Hex;
}) {
  const cache = getCache();
  cleanupCache(cache);

  const built = await buildAlert(params.action, params.txHash);

  if (cache.has(built.dedupeKey)) {
    return {
      ok: true,
      duplicate: true,
      action: params.action,
      txHash: params.txHash,
    };
  }

  await postTelegramMessage(built.message);
  cache.set(built.dedupeKey, Date.now());

  return {
    ok: true,
    duplicate: false,
    action: params.action,
    txHash: params.txHash,
  };
}
