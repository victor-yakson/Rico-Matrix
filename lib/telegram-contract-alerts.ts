import "server-only";

import {
  type Abi,
  createPublicClient,
  decodeEventLog,
  decodeFunctionData,
  formatUnits,
  http,
  type Hex,
} from "viem";

import {
  CONTRACT_ABI,
  LEGACY_V2_CONTRACT_ADDRESS,
  RICO_CHAIN_CONFIG,
  RICO_MATRIX_V3_ABI,
} from "@/utils/constants";

export type MatrixAlertAction =
  | "registration"
  | "chapter-upgrade"
  | "royalty-claim";

type SupportedFunctionName =
  | "joinLibrary"
  | "buyNewChapter"
  | "buyChapterBatch"
  | "claimRoyaltyV3"
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
const CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const TELEGRAM_CONTRACT_ABI = [
  ...RICO_MATRIX_V3_ABI,
  ...CONTRACT_ABI,
] as unknown as Abi;

type TelegramAlertChainId = 1 | 56 | 137 | 8453 | 4663;

type AlertChainConfig = {
  id: TelegramAlertChainId;
  name: string;
  matrix: Hex;
  explorerTxBaseUrl: string;
  rpcUrls: string[];
};

const supportedAlertChains: Record<TelegramAlertChainId, AlertChainConfig> = {
  1: {
    id: 1,
    name: "Ethereum",
    matrix: RICO_CHAIN_CONFIG[1].matrix,
    explorerTxBaseUrl: "https://etherscan.io/tx/",
    rpcUrls: [
      process.env.NEXT_PUBLIC_ETH_RPC_URL || "",
      process.env.ETH_RPC_URL || "",
      "https://ethereum-rpc.publicnode.com",
    ],
  },
  56: {
    id: 56,
    name: "BNB Smart Chain",
    matrix: RICO_CHAIN_CONFIG[56].matrix,
    explorerTxBaseUrl: "https://bscscan.com/tx/",
    rpcUrls: [
      process.env.NEXT_PUBLIC_BSC_RPC_URL || "",
      process.env.BSC_RPC_URL || "",
      process.env.RPC_URL || "",
      "https://bsc-dataseed.binance.org",
    ],
  },
  137: {
    id: 137,
    name: "Polygon",
    matrix: RICO_CHAIN_CONFIG[137].matrix,
    explorerTxBaseUrl: "https://polygonscan.com/tx/",
    rpcUrls: [
      process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "",
      process.env.POLYGON_RPC_URL || "",
      "https://polygon-rpc.com",
    ],
  },
  8453: {
    id: 8453,
    name: "Base",
    matrix: RICO_CHAIN_CONFIG[8453].matrix,
    explorerTxBaseUrl: "https://basescan.org/tx/",
    rpcUrls: [
      process.env.NEXT_PUBLIC_BASE_RPC_URL || "",
      process.env.BASE_RPC_URL || "",
      "https://mainnet.base.org",
    ],
  },
  4663: {
    id: 4663,
    name: "Robinhood Chain",
    matrix: RICO_CHAIN_CONFIG[4663].matrix,
    explorerTxBaseUrl: "https://robinhoodchain.blockscout.com/tx/",
    rpcUrls: [
      process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL || "",
      process.env.ROBINHOOD_RPC_URL || "",
      "https://rpc.mainnet.chain.robinhood.com",
    ],
  },
};

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

function getAlertChain(chainId: number): AlertChainConfig {
  const chain = supportedAlertChains[chainId as TelegramAlertChainId];
  if (!chain) {
    throw new Error("Unsupported chain for Telegram alerting.");
  }

  return chain;
}

function getRpcUrl(chain: AlertChainConfig) {
  const rpcUrl = chain.rpcUrls.find((url) => url.trim());
  if (!rpcUrl) {
    throw new Error(`No RPC URL configured for ${chain.name}.`);
  }

  return rpcUrl;
}

function getPublicClient(chain: AlertChainConfig) {
  return createPublicClient({
    transport: http(getRpcUrl(chain)),
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

function getTransactionUrl(chain: AlertChainConfig, hash: Hex) {
  return `${chain.explorerTxBaseUrl}${hash}`;
}

function isSupportedFunctionName(
  functionName: string,
): functionName is SupportedFunctionName {
  return (
    functionName === "joinLibrary" ||
    functionName === "buyNewChapter" ||
    functionName === "buyChapterBatch" ||
    functionName === "claimRoyaltyV3" ||
    functionName === "claimRoyaltyV2" ||
    functionName === "claimLegacyRoyalty"
  );
}

function isExpectedContractTarget(to: Hex, chain: AlertChainConfig) {
  const target = to.toLowerCase();
  return (
    target === chain.matrix.toLowerCase() ||
    target === LEGACY_V2_CONTRACT_ADDRESS.toLowerCase()
  );
}

async function getVerifiedTransaction(hash: Hex, chain: AlertChainConfig) {
  const publicClient = getPublicClient(chain);
  const [tx, receipt] = await Promise.all([
    publicClient.getTransaction({ hash }),
    publicClient.getTransactionReceipt({ hash }),
  ]);

  if (!tx.to || !isExpectedContractTarget(tx.to, chain)) {
    throw new Error(`Transaction was not sent to the Rico Matrix contract on ${chain.name}.`);
  }

  if (receipt.status !== "success") {
    throw new Error("Transaction did not complete successfully on-chain.");
  }

  const decoded = decodeFunctionData({
    abi: TELEGRAM_CONTRACT_ABI,
    data: tx.input,
  });

  if (!isSupportedFunctionName(decoded.functionName)) {
    throw new Error("Unsupported contract call for Telegram alerting.");
  }

  return {
    publicClient,
    chain,
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
        abi: TELEGRAM_CONTRACT_ABI,
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
  chain: AlertChainConfig,
  reader: Hex,
) {
  try {
    const summaryResult = (await publicClient.readContract({
      address: chain.matrix,
      abi: RICO_MATRIX_V3_ABI,
      functionName: "getReaderSummary",
      args: [reader],
    })) as {
      referrer: Hex;
      track1Unlocked: bigint;
      track2Unlocked: bigint;
      royaltyPercent: bigint;
    };

    return summaryResult;
  } catch {
    return {
      referrer: "0x0000000000000000000000000000000000000000" as Hex,
      track1Unlocked: BigInt(0),
      track2Unlocked: BigInt(0),
      royaltyPercent: BigInt(0),
    };
  }
}

async function readChapterPrice(
  publicClient: ReturnType<typeof getPublicClient>,
  chain: AlertChainConfig,
  chapter: number,
) {
  const prices = (await publicClient.readContract({
    address: chain.matrix,
    abi: RICO_MATRIX_V3_ABI,
    functionName: "getChapterPrices",
  })) as readonly bigint[];

  return prices[chapter - 1] || BigInt(0);
}

async function buildRegistrationAlert(
  hash: Hex,
  chain: AlertChainConfig,
): Promise<AlertBuildResult> {
  const { publicClient, tx, receipt, functionName, args } =
    await getVerifiedTransaction(hash, chain);

  if (functionName !== "joinLibrary") {
    throw new Error("Transaction is not a library registration.");
  }

  const joined = decodeMatchingEvent<{
    reader: Hex;
    referrer: Hex;
  }>("ReaderJoined", receipt.logs as Array<{ data: Hex; topics: readonly Hex[] }>);

  const referrerArg = args[1] as Hex | undefined;
  const reader = joined?.reader || tx.from;
  const referrer = joined?.referrer || referrerArg || "0x0000000000000000000000000000000000000000";
  const amountPaid = await readChapterPrice(publicClient, chain, 1);

  const message = [
    "🥳 <b>NEW MEMBER JOINED THE MATRIX!</b>",
    "",
    `🌐 <b>Network:</b> ${escapeHtml(chain.name)}`,
    `👤 <b>User:</b> <code>${escapeHtml(shortAddress(reader))}</code>`,
    `🧬 <b>Sponsor:</b> <code>${escapeHtml(shortAddress(referrer))}</code>`,
    "🏆 <b>Starting Chapter:</b> Chapter 1",
    `💳 <b>Amount Paid:</b> ${escapeHtml(formatUsdt(amountPaid))} USD`,
    `🔗 <b>Tx Hash:</b> <a href="${escapeHtml(getTransactionUrl(chain, hash))}">View Transaction</a>`,
    "",
    "⚡️ Welcome to the Rico Ecosystem! The matrix is expanding. 🚀",
  ].join("\n");

  return {
    message,
    dedupeKey: `${chain.id}:registration:${hash}`,
  };
}

async function buildChapterUpgradeAlert(
  hash: Hex,
  chain: AlertChainConfig,
): Promise<AlertBuildResult> {
  const { tx, receipt, functionName, args } = await getVerifiedTransaction(hash, chain);

  if (functionName !== "buyNewChapter" && functionName !== "buyChapterBatch") {
    throw new Error("Transaction is not a chapter purchase.");
  }

  const isBatch = functionName === "buyChapterBatch";
  const track = Number(args[1] as number | bigint);
  const chapter = Number(args[2] as number | bigint);
  const endChapter = isBatch ? Number(args[3] as number | bigint) : chapter;
  const chapterPurchased = decodeMatchingEvent<{
    reader: Hex;
    track: number;
    chapter: number;
    price: bigint;
  }>("ChapterPurchased", receipt.logs as Array<{ data: Hex; topics: readonly Hex[] }>);

  const reader = chapterPurchased?.reader || tx.from;
  const contractValue = chapterPurchased?.price || BigInt(0);
  const trackLabel = getTrackLabel(track);
  const chapterLabel = isBatch
    ? `Chapters ${chapter}-${endChapter}`
    : `Chapter ${chapter}`;
  const tierLabel = isBatch
    ? `${getTierLabel(chapter)} to ${getTierLabel(endChapter)}`
    : getTierLabel(chapter);

  const message = [
    isBatch
      ? "🚀 <b>BATCH CHAPTER PURCHASE UNLOCKED!</b>"
      : "🚀 <b>CHAPTER UPGRADE UNLOCKED!</b>",
    "",
    `🌐 <b>Network:</b> ${escapeHtml(chain.name)}`,
    `👤 <b>User:</b> <code>${escapeHtml(shortAddress(reader))}</code>`,
    `🧭 <b>Matrix Track:</b> ${escapeHtml(trackLabel)}`,
    `⬆️ <b>Upgraded To:</b> ${chapterLabel}`,
    `💎 <b>New Tier:</b> ${escapeHtml(tierLabel)}`,
    `💰 <b>Contract Value:</b> ${escapeHtml(formatUsdt(contractValue))} USD`,
    `🔗 <b>Tx Hash:</b> <a href="${escapeHtml(getTransactionUrl(chain, hash))}">View Transaction</a>`,
    "",
    "🔮 Leveling up the matrix engine. Higher chapters, higher rewards! 🔥",
  ].join("\n");

  return {
    message,
    dedupeKey: `${chain.id}:chapter-upgrade:${hash}`,
  };
}

async function buildRoyaltyClaimAlert(
  hash: Hex,
  chain: AlertChainConfig,
): Promise<AlertBuildResult> {
  const { publicClient, tx, receipt, functionName } =
    await getVerifiedTransaction(hash, chain);

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
  const summary = await readReaderSummary(publicClient, chain, reader);

  const claimLabel =
    functionName === "claimRoyaltyV2" || functionName === "claimLegacyRoyalty"
      ? "V2 Royalty"
      : "Current Royalty";

  const message = [
    "💸 <b>ROYALTY PAYOUT CLAIMED!</b>",
    "",
    `🌐 <b>Network:</b> ${escapeHtml(chain.name)}`,
    `👤 <b>Claimant:</b> <code>${escapeHtml(shortAddress(reader))}</code>`,
    `👑 <b>Claim Type:</b> ${escapeHtml(claimLabel)}`,
    `📚 <b>Chapter Access:</b> ${escapeHtml(getCurrentChapterLabel(summary))}`,
    `📊 <b>Royalty Share:</b> ${escapeHtml(formatRoyaltyPercent(summary.royaltyPercent))}`,
    `💵 <b>Amount Claimed:</b> ${escapeHtml(formatUsdt(amount))} USD`,
    `🔗 <b>Tx Hash:</b> <a href="${escapeHtml(getTransactionUrl(chain, hash))}">View Transaction</a>`,
    "",
    "✨ Enjoy your royalty-powered passive income. Keep growing, keep earning! 👑",
  ].join("\n");

  return {
    message,
    dedupeKey: `${chain.id}:royalty-claim:${hash}`,
  };
}

async function buildAlert(
  action: MatrixAlertAction,
  hash: Hex,
  chainId: number,
): Promise<AlertBuildResult> {
  const chain = getAlertChain(chainId);

  switch (action) {
    case "registration":
      return buildRegistrationAlert(hash, chain);
    case "chapter-upgrade":
      return buildChapterUpgradeAlert(hash, chain);
    case "royalty-claim":
      return buildRoyaltyClaimAlert(hash, chain);
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
  chainId: number;
}) {
  const cache = getCache();
  cleanupCache(cache);

  const built = await buildAlert(params.action, params.txHash, params.chainId);

  if (cache.has(built.dedupeKey)) {
    return {
      ok: true,
      duplicate: true,
      action: params.action,
      txHash: params.txHash,
      chainId: params.chainId,
    };
  }

  await postTelegramMessage(built.message);
  cache.set(built.dedupeKey, Date.now());

  return {
    ok: true,
    duplicate: false,
    action: params.action,
    txHash: params.txHash,
    chainId: params.chainId,
  };
}
