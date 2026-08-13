export const RICO_MATRIX_V3_HUB_ADDRESS =
  (process.env.NEXT_PUBLIC_RICOMATRIXV3_HUB_ADDRESS as `0x${string}`) ||
  "0x7b31b39829E5f0fFbCFd2032B3d8aD8B8F415177";
export const RICO_MATRIX_V3_SPOKE_ADDRESS =
  (process.env.NEXT_PUBLIC_RICOMATRIXV3_SPOKE_ADDRESS as `0x${string}`) ||
  "0x7b31b39829e5f0ffbcfd2032b3d8ad8b8f415177";
export const RICO_MATRIX_V3_ADDRESS =
  (process.env.NEXT_PUBLIC_RICO_MATRIX_V3_ADDRESS as `0x${string}`) ||
  RICO_MATRIX_V3_SPOKE_ADDRESS;
export const RICO_MIGRATOR_ADDRESS =
  (process.env.NEXT_PUBLIC_MIGRATOR_ADDRESS as `0x${string}`) ||
  "0x1a5F3275F05aC6184F8f151e008CE489117a738D";
export const OMNICHAIN_SYNC_MANAGER_ADDRESS =
  (process.env.NEXT_PUBLIC_OMNICHAIN_SYNC_MANAGER_ADDRESS as `0x${string}`) ||
  "0x30f884b45d934984ede86e74930e0b7742c6bfba";
export const RICO_FACTORY_ADDRESS =
  (process.env.NEXT_PUBLIC_RICO_FACTORY_ADDRESS as `0x${string}`) ||
  "0x618d4f7fc0e5cACb1bE8E6b066095327E9084533";
export const RICO_MATRIX_LOGIC_LIB_ADDRESS =
  (process.env.NEXT_PUBLIC_RICO_MATRIX_LOGIC_LIB_ADDRESS as `0x${string}`) ||
  "0xba427B5502928FD7dc3C858480929c4a432b2820";

export const CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`) ||
  RICO_MATRIX_V3_ADDRESS;
export const LEGACY_V2_CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_V2_CONTRACT_ADDRESS as `0x${string}`) ||
  (process.env.NEXT_PUBLIC_LEGACY_CONTRACT_ADDRESS as `0x${string}`) ||
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`);
export const USDT_CONTRACT_ADDRESS = process.env
  .NEXT_PUBLIC_USDT_CONTRACT_ADDRESS as `0x${string}`;
export const TOKEN_CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS as `0x${string}`) ||
  "0x71a238ba3837896b6532b3514A58c483850ef458";
export const SURVEY_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_SURVEY_CONTRACT_ADDRESS as `0x${string}`;
export const VOTING_CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_VOTING_CONTRACT_ADDRESS as `0x${string}`) ||
  "0xb053B45F1c991bCfDF34b3668F1e0cE561b680A0";
export const RICO_STAKING_CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_RICO_STAKING_CONTRACT_ADDRESS as `0x${string}`) ||
  "0xE90b351a72AB1A535d763a98C9e6e260f8098042";

export type RicoPaymentToken = {
  symbol: string;
  address: `0x${string}`;
  decimals: number;
};

const ETH_USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const ETH_USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const ETH_DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const BSC_USDC = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";
const BSC_USDT = "0x55d398326f99059fF775485246999027B3197955";
const BSC_DAI = "0x1AF3F329e8BE154074D8769D1FFa4eE058B1Dbc3";
const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const BASE_USDS = "0x820C137fa70C8691f0e44Dc420a5e53c168921Dc";
const POLYGON_USDC = "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359";
const ROBINHOOD_USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";

const ETH_RICO_TOKEN =
  (process.env.NEXT_PUBLIC_ETH_RICO_TOKEN_ADDRESS as `0x${string}`) ||
  "0x6252d3cfbaf5e9957872c9d55f771c0cc401f71d";
const BSC_RICO_TOKEN =
  (process.env.NEXT_PUBLIC_BSC_RICO_TOKEN_ADDRESS as `0x${string}`) ||
  TOKEN_CONTRACT_ADDRESS;
const BASE_RICO_TOKEN =
  (process.env.NEXT_PUBLIC_BASE_RICO_TOKEN_ADDRESS as `0x${string}`) ||
  "0x757a6ccc3d163455ba76ce253872a6cf38e1e0af";
const ROBINHOOD_RICO_TOKEN =
  (process.env.NEXT_PUBLIC_ROBINHOOD_RICO_TOKEN_ADDRESS as `0x${string}`) ||
  "0xf72a8Cccb5662ce382b0E2E298b013a703E27398";
const POLYGON_RICO_TOKEN =
  (process.env.NEXT_PUBLIC_POLYGON_RICO_TOKEN_ADDRESS as `0x${string}`) ||
  "0xf72a8Cccb5662ce382b0E2E298b013a703E27398";

export const RICO_TOKEN_ADDRESSES = {
  1: ETH_RICO_TOKEN,
  56: BSC_RICO_TOKEN,
  137: POLYGON_RICO_TOKEN,
  8453: BASE_RICO_TOKEN,
  4663: ROBINHOOD_RICO_TOKEN,
} as const;

export type RicoTokenChainId = keyof typeof RICO_TOKEN_ADDRESSES;

export const getRicoTokenAddress = (chainId?: number) =>
  RICO_TOKEN_ADDRESSES[(chainId || 56) as RicoTokenChainId] ||
  TOKEN_CONTRACT_ADDRESS;

const ETH_PAYMENT_TOKENS: RicoPaymentToken[] = [
  { symbol: "USDC", address: ETH_USDC as `0x${string}`, decimals: 6 },
  { symbol: "USDT", address: ETH_USDT as `0x${string}`, decimals: 6 },
  { symbol: "DAI", address: ETH_DAI as `0x${string}`, decimals: 18 },
];

const BSC_PAYMENT_TOKENS: RicoPaymentToken[] = [
  { symbol: "USDC", address: BSC_USDC as `0x${string}`, decimals: 18 },
  { symbol: "USDT", address: BSC_USDT as `0x${string}`, decimals: 18 },
  { symbol: "DAI", address: BSC_DAI as `0x${string}`, decimals: 18 },
];

const BASE_PAYMENT_TOKENS: RicoPaymentToken[] = [
  { symbol: "USDC", address: BASE_USDC as `0x${string}`, decimals: 6 },
  { symbol: "USDS", address: BASE_USDS as `0x${string}`, decimals: 18 },
];

const POLYGON_PAYMENT_TOKENS: RicoPaymentToken[] = [
  { symbol: "USDC", address: POLYGON_USDC as `0x${string}`, decimals: 6 },
];

const ROBINHOOD_PAYMENT_TOKENS: RicoPaymentToken[] = [
  { symbol: "USDG", address: ROBINHOOD_USDG as `0x${string}`, decimals: 6 },
];

const resolvePaymentToken = (
  tokens: RicoPaymentToken[],
  override?: `0x${string}`,
) =>
  tokens.find(
    (token) => token.address.toLowerCase() === override?.toLowerCase(),
  ) || tokens[0];

const ETH_DEFAULT_PAYMENT_TOKEN = resolvePaymentToken(
  ETH_PAYMENT_TOKENS,
  process.env.NEXT_PUBLIC_ETH_PAYMENT_TOKEN_ADDRESS as `0x${string}`,
);
const BSC_DEFAULT_PAYMENT_TOKEN = resolvePaymentToken(
  BSC_PAYMENT_TOKENS,
  (process.env.NEXT_PUBLIC_BSC_PAYMENT_TOKEN_ADDRESS as `0x${string}`) ||
    USDT_CONTRACT_ADDRESS,
);
const BASE_DEFAULT_PAYMENT_TOKEN = resolvePaymentToken(
  BASE_PAYMENT_TOKENS,
  process.env.NEXT_PUBLIC_BASE_PAYMENT_TOKEN_ADDRESS as `0x${string}`,
);
const POLYGON_DEFAULT_PAYMENT_TOKEN = resolvePaymentToken(
  POLYGON_PAYMENT_TOKENS,
  process.env.NEXT_PUBLIC_POLYGON_PAYMENT_TOKEN_ADDRESS as `0x${string}`,
);
const ROBINHOOD_DEFAULT_PAYMENT_TOKEN = resolvePaymentToken(
  ROBINHOOD_PAYMENT_TOKENS,
  process.env.NEXT_PUBLIC_ROBINHOOD_PAYMENT_TOKEN_ADDRESS as `0x${string}`,
);

export const RICO_CHAIN_CONFIG = {
  1: {
    id: 1,
    name: "Ethereum",
    lzEid: 30101,
    cctpDomain: 0,
    matrix: RICO_MATRIX_V3_ADDRESS,
    migrator: RICO_MIGRATOR_ADDRESS,
    syncManager: OMNICHAIN_SYNC_MANAGER_ADDRESS,
    paymentTokens: ETH_PAYMENT_TOKENS,
    paymentToken: ETH_DEFAULT_PAYMENT_TOKEN.address,
    paymentSymbol: ETH_DEFAULT_PAYMENT_TOKEN.symbol,
    paymentDecimals: ETH_DEFAULT_PAYMENT_TOKEN.decimals,
  },
  56: {
    id: 56,
    name: "BNB Smart Chain",
    lzEid: 30102,
    cctpDomain: 0,
    matrix: RICO_MATRIX_V3_ADDRESS,
    migrator: RICO_MIGRATOR_ADDRESS,
    syncManager: OMNICHAIN_SYNC_MANAGER_ADDRESS,
    paymentTokens: BSC_PAYMENT_TOKENS,
    paymentToken: BSC_DEFAULT_PAYMENT_TOKEN.address,
    paymentSymbol: BSC_DEFAULT_PAYMENT_TOKEN.symbol,
    paymentDecimals: BSC_DEFAULT_PAYMENT_TOKEN.decimals,
  },
  8453: {
    id: 8453,
    name: "Base",
    lzEid: 30184,
    cctpDomain: 6,
    matrix: RICO_MATRIX_V3_ADDRESS,
    migrator: RICO_MIGRATOR_ADDRESS,
    syncManager: OMNICHAIN_SYNC_MANAGER_ADDRESS,
    paymentTokens: BASE_PAYMENT_TOKENS,
    paymentToken: BASE_DEFAULT_PAYMENT_TOKEN.address,
    paymentSymbol: BASE_DEFAULT_PAYMENT_TOKEN.symbol,
    paymentDecimals: BASE_DEFAULT_PAYMENT_TOKEN.decimals,
  },
  137: {
    id: 137,
    name: "Polygon",
    lzEid: 30109,
    cctpDomain: 7,
    matrix: RICO_MATRIX_V3_ADDRESS,
    migrator: RICO_MIGRATOR_ADDRESS,
    syncManager: OMNICHAIN_SYNC_MANAGER_ADDRESS,
    paymentTokens: POLYGON_PAYMENT_TOKENS,
    paymentToken: POLYGON_DEFAULT_PAYMENT_TOKEN.address,
    paymentSymbol: POLYGON_DEFAULT_PAYMENT_TOKEN.symbol,
    paymentDecimals: POLYGON_DEFAULT_PAYMENT_TOKEN.decimals,
  },
  4663: {
    id: 4663,
    name: "Robinhood Chain",
    lzEid: 30416,
    cctpDomain: 0,
    matrix: RICO_MATRIX_V3_ADDRESS,
    migrator: RICO_MIGRATOR_ADDRESS,
    syncManager: OMNICHAIN_SYNC_MANAGER_ADDRESS,
    paymentTokens: ROBINHOOD_PAYMENT_TOKENS,
    paymentToken: ROBINHOOD_DEFAULT_PAYMENT_TOKEN.address,
    paymentSymbol: ROBINHOOD_DEFAULT_PAYMENT_TOKEN.symbol,
    paymentDecimals: ROBINHOOD_DEFAULT_PAYMENT_TOKEN.decimals,
  },
} as const;

export type RicoSupportedChainId = keyof typeof RICO_CHAIN_CONFIG;

export const getRicoChainConfig = (chainId?: number) =>
  RICO_CHAIN_CONFIG[(chainId || 56) as RicoSupportedChainId] || RICO_CHAIN_CONFIG[56];

export const RICO_MIGRATOR_ABI = [
  {
    inputs: [],
    name: "importUser",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const RICO_MATRIX_V3_ABI = [{"inputs":[{"internalType":"address","name":"rootColdWallet","type":"address"},{"internalType":"address","name":"syncManagerAddr","type":"address"},{"internalType":"address","name":"migratorAddr","type":"address"},{"internalType":"address","name":"platform1","type":"address"},{"internalType":"address","name":"platform2","type":"address"},{"internalType":"address","name":"platform3","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"InvalidAmount","type":"error"},{"inputs":[],"name":"LibraryClosed","type":"error"},{"inputs":[],"name":"NoRicoToClaim","type":"error"},{"inputs":[],"name":"NoRoyalty","type":"error"},{"inputs":[],"name":"OnlyMigrator","type":"error"},{"inputs":[],"name":"OnlyOwner","type":"error"},{"inputs":[],"name":"OnlySyncManager","type":"error"},{"inputs":[],"name":"ReaderExists","type":"error"},{"inputs":[],"name":"TokenNotSupported","type":"error"},{"inputs":[],"name":"UnauthorizedSpokeEid","type":"error"},{"inputs":[],"name":"ZeroAddress","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint8","name":"track","type":"uint8"},{"indexed":false,"internalType":"uint8","name":"startCh","type":"uint8"},{"indexed":false,"internalType":"uint8","name":"endCh","type":"uint8"},{"indexed":false,"internalType":"uint256","name":"totalUSD","type":"uint256"}],"name":"ChapterPurchasedHub","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amountUSD","type":"uint256"}],"name":"GlobalRoyaltyAccumulated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"address","name":"referrer","type":"address"},{"indexed":false,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"uint256","name":"totalUSD","type":"uint256"}],"name":"JoinedHub","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"recipient","type":"address"},{"indexed":false,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"uint256","name":"amountUSD","type":"uint256"},{"indexed":false,"internalType":"uint32","name":"dstEid","type":"uint32"}],"name":"RoyaltyCrossDispatched","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint32","name":"eid","type":"uint32"},{"indexed":false,"internalType":"bool","name":"authorized","type":"bool"}],"name":"SpokeEidStatusUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"address","name":"referrer","type":"address"},{"indexed":false,"internalType":"uint8","name":"track","type":"uint8"},{"indexed":false,"internalType":"uint8","name":"chapter","type":"uint8"}],"name":"UserBoostedHub","type":"event"},{"inputs":[],"name":"LAST_CHAPTER","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"LEADERBOARD_SIZE","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"accRoyaltyPerPoint","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"activeSpokeEids","outputs":[{"internalType":"uint32","name":"","type":"uint32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"aiPlatform1","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"aiPlatform2","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"aiPlatform3","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"address","name":"referrerAddress","type":"address"},{"internalType":"uint8","name":"targetChapter","type":"uint8"}],"name":"boostUserBothTracksHub","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"address","name":"referrerAddress","type":"address"},{"internalType":"uint8","name":"track","type":"uint8"},{"internalType":"uint8","name":"targetChapter","type":"uint8"}],"name":"boostUserHub","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"bucketBps","outputs":[{"internalType":"uint16","name":"","type":"uint16"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"paymentToken","type":"address"},{"internalType":"uint8","name":"track","type":"uint8"},{"internalType":"uint8","name":"startCh","type":"uint8"},{"internalType":"uint8","name":"endCh","type":"uint8"}],"name":"buyChapterBatchHub","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"cctpMessenger","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint8","name":"","type":"uint8"}],"name":"chapterPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"claimRico","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"toReceiveToken","type":"address"},{"internalType":"uint32","name":"targetDstEid","type":"uint32"}],"name":"claimRoyaltyV3","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"idToAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint32","name":"","type":"uint32"}],"name":"isAuthorizedSpokeEid","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint32","name":"","type":"uint32"}],"name":"isRegisteredSpokeEid","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"isSupportedPaymentToken","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"paymentToken","type":"address"},{"internalType":"address","name":"referrerAddress","type":"address"}],"name":"joinLibraryHub","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"l1Bps","outputs":[{"internalType":"uint16","name":"","type":"uint16"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"lastReaderId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"libraryOpen","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint32","name":"","type":"uint32"}],"name":"lzEidToCctpDomain","outputs":[{"internalType":"uint32","name":"","type":"uint32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"migrator","outputs":[{"internalType":"contract IRicoV1Migrator","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint32","name":"srcEid","type":"uint32"},{"internalType":"uint8","name":"actionType","type":"uint8"},{"internalType":"bytes","name":"payload","type":"bytes"}],"name":"processSpokeOrder","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"quantAi1","outputs":[{"internalType":"uint16","name":"","type":"uint16"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"quantAi2","outputs":[{"internalType":"uint16","name":"","type":"uint16"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"quantAi3","outputs":[{"internalType":"uint16","name":"","type":"uint16"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"readers","outputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"address","name":"referrer","type":"address"},{"internalType":"uint256","name":"partnersCount","type":"uint256"},{"internalType":"uint256","name":"royaltyPoints","type":"uint256"},{"internalType":"uint256","name":"royaltyDebt","type":"uint256"},{"internalType":"uint256","name":"royaltiesClaimedV3","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"bool","name":"supported","type":"bool"}],"name":"registerPaymentToken","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint32","name":"eid","type":"uint32"},{"internalType":"bool","name":"active","type":"bool"}],"name":"registerSpokeEid","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"rewardToken","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"ricoClaimed","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"ricoExpected","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"royaltyPot","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"},{"components":[{"internalType":"uint256","name":"v1Id","type":"uint256"},{"internalType":"address","name":"referrer","type":"address"},{"internalType":"uint256","name":"partnersCount","type":"uint256"},{"internalType":"uint256","name":"t1Earned","type":"uint256"},{"internalType":"uint256","name":"t2Earned","type":"uint256"},{"internalType":"uint256","name":"t1Cycles","type":"uint256"},{"internalType":"uint256","name":"t2Cycles","type":"uint256"},{"internalType":"uint256","name":"royaltyAvail","type":"uint256"},{"internalType":"uint256","name":"royaltyClaimed","type":"uint256"},{"internalType":"uint256","name":"royaltyPercent","type":"uint256"},{"internalType":"uint256","name":"ricoExpected","type":"uint256"},{"internalType":"uint256","name":"ricoClaimed","type":"uint256"},{"internalType":"uint8","name":"t1Unlocked","type":"uint8"},{"internalType":"uint8","name":"t2Unlocked","type":"uint8"}],"internalType":"struct SnapshotSeed","name":"seed","type":"tuple"}],"name":"seedUserSnapshot","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"_stargatePool","type":"address"},{"internalType":"address","name":"_cctpMessenger","type":"address"}],"name":"setBridgeRouters","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint32","name":"_lzEid","type":"uint32"},{"internalType":"uint32","name":"_cctpDomain","type":"uint32"}],"name":"setCctpDomainMapping","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_rewardToken","type":"address"}],"name":"setRewardToken","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"stargatePool","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"syncManager","outputs":[{"internalType":"contract IOmnichainSyncManager","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"topEarners","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"topEarnings","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"topReferralCounts","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"topReferrers","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalRoyaltyPoints","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"totalUnilevelEarned","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"viewRicoPending","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}] as const;

export const CONTRACT_ABI = [
  {
    inputs: [
      { internalType: "address", name: "v1Address", type: "address" },
      { internalType: "address", name: "usdtAddress", type: "address" },
      { internalType: "address", name: "rewardTokenAddress", type: "address" },
      { internalType: "address", name: "feeWalletA", type: "address" },
      { internalType: "address", name: "feeWalletB", type: "address" },
      { internalType: "address", name: "feeWalletC", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  { inputs: [], name: "AdminRenounced", type: "error" },
  { inputs: [], name: "AlreadyMigrated", type: "error" },
  { inputs: [], name: "BadBucketSum", type: "error" },
  { inputs: [], name: "BadChapter1", type: "error" },
  { inputs: [], name: "BadReferrerState", type: "error" },
  { inputs: [], name: "ChapterAlreadyUnlocked", type: "error" },
  { inputs: [], name: "InvalidChapter", type: "error" },
  { inputs: [], name: "InvalidTrack", type: "error" },
  { inputs: [], name: "LibraryClosed", type: "error" },
  { inputs: [], name: "NoLegacyRoyalty", type: "error" },
  { inputs: [], name: "NoRicoToClaim", type: "error" },
  { inputs: [], name: "NoRoyalty", type: "error" },
  { inputs: [], name: "NotInV1", type: "error" },
  { inputs: [], name: "NotMigrated", type: "error" },
  { inputs: [], name: "OnlyAdmin", type: "error" },
  { inputs: [], name: "OnlyOwner", type: "error" },
  { inputs: [], name: "OwnershipRenounced", type: "error" },
  { inputs: [], name: "PreviousChapterRequired", type: "error" },
  { inputs: [], name: "ReaderExists", type: "error" },
  { inputs: [], name: "ReaderNotExists", type: "error" },
  { inputs: [], name: "Reentrancy", type: "error" },
  { inputs: [], name: "ReferrerChapterInactive", type: "error" },
  { inputs: [], name: "ReferrerNotExists", type: "error" },
  { inputs: [], name: "TokenNotContract", type: "error" },
  { inputs: [], name: "TransferFailed", type: "error" },
  { inputs: [], name: "V1CallFailed", type: "error" },
  { inputs: [], name: "X6Overflow", type: "error" },
  { inputs: [], name: "ZeroAddress", type: "error" },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "reader",
        type: "address",
      },
      { indexed: false, internalType: "uint8", name: "track", type: "uint8" },
      { indexed: false, internalType: "uint8", name: "chapter", type: "uint8" },
      {
        indexed: false,
        internalType: "uint256",
        name: "price",
        type: "uint256",
      },
    ],
    name: "ChapterPurchased",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "reader",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "referrer",
        type: "address",
      },
      { indexed: false, internalType: "uint8", name: "track", type: "uint8" },
      { indexed: false, internalType: "uint8", name: "chapter", type: "uint8" },
    ],
    name: "ChapterUnlocked",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "by", type: "address" },
    ],
    name: "ContractRenounced",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "reader",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "LegacyRoyaltyClaimed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "bool", name: "open", type: "bool" },
    ],
    name: "LibraryOpenChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "v1Id",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "referrer",
        type: "address",
      },
    ],
    name: "Migrated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "reader",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "referrer",
        type: "address",
      },
      { indexed: false, internalType: "uint8", name: "track", type: "uint8" },
      { indexed: false, internalType: "uint8", name: "chapter", type: "uint8" },
      { indexed: false, internalType: "uint8", name: "place", type: "uint8" },
    ],
    name: "NewReaderPlace",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "reader",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "referrer",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "readerId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "referrerId",
        type: "uint256",
      },
    ],
    name: "ReaderJoined",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "reader",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "currentReferrer",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "caller",
        type: "address",
      },
      { indexed: false, internalType: "uint8", name: "track", type: "uint8" },
      { indexed: false, internalType: "uint8", name: "chapter", type: "uint8" },
    ],
    name: "Reinvest",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "usdtBasis",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "ricoAmount",
        type: "uint256",
      },
    ],
    name: "RicoAccrued",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RicoClaimed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "from", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RoyaltyAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "reader",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RoyaltyClaimed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      { indexed: false, internalType: "uint8", name: "track", type: "uint8" },
      { indexed: false, internalType: "uint8", name: "chapter", type: "uint8" },
      {
        indexed: false,
        internalType: "uint8",
        name: "uplineLevel",
        type: "uint8",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "UnilevelRoyaltyPayout",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "intended",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "actual",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "UplinePayoutFallback",
    type: "event",
  },
  {
    inputs: [],
    name: "LAST_CHAPTER",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "LEADERBOARD_SIZE",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "RICO_PER_USDT",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "ROYALTY_PERCENT",
    outputs: [{ internalType: "uint16", name: "", type: "uint16" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "V1",
    outputs: [
      { internalType: "contract IRicoMatrixV1", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "accRoyaltyPerPoint",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "admin",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "adminRenounced",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint8", name: "track", type: "uint8" },
      { internalType: "uint8", name: "chapter", type: "uint8" },
    ],
    name: "buyNewChapter",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    name: "chapterPrice",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "claimLegacyRoyalty",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "claimRico",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "claimRoyaltyV2",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "readerAddr", type: "address" },
      { internalType: "uint8", name: "chapter", type: "uint8" },
    ],
    name: "findFreeTrack1Referrer",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "readerAddr", type: "address" },
      { internalType: "uint8", name: "chapter", type: "uint8" },
    ],
    name: "findFreeTrack2Referrer",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getChapterPrices",
    outputs: [
      { internalType: "uint256[13]", name: "prices", type: "uint256[13]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getMigrationAndRoyaltyUI",
    outputs: [
      { internalType: "uint8", name: "status", type: "uint8" },
      { internalType: "uint256", name: "v1RoyaltyPercent", type: "uint256" },
      { internalType: "uint256", name: "legacyClaimable", type: "uint256" },
      { internalType: "uint256", name: "v2Claimable", type: "uint256" },
      { internalType: "uint256", name: "totalClaimable", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "readerAddr", type: "address" }],
    name: "getReaderSummary",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "id", type: "uint256" },
          { internalType: "address", name: "referrer", type: "address" },
          { internalType: "uint256", name: "partnersCount", type: "uint256" },
          {
            internalType: "uint256",
            name: "track1TotalEarned",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "track2TotalEarned",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "track1TotalCycles",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "track2TotalCycles",
            type: "uint256",
          },
          { internalType: "uint256", name: "track1Unlocked", type: "uint256" },
          { internalType: "uint256", name: "track2Unlocked", type: "uint256" },
          {
            internalType: "uint256",
            name: "royaltyAvailable",
            type: "uint256",
          },
          { internalType: "uint256", name: "royaltyClaimed", type: "uint256" },
          { internalType: "uint256", name: "royaltyPercent", type: "uint256" },
          { internalType: "uint256", name: "ricoShouldHave", type: "uint256" },
          { internalType: "uint256", name: "ricoSent", type: "uint256" },
          { internalType: "uint256", name: "ricoPending", type: "uint256" },
        ],
        internalType: "struct RICOMATRIX.ReaderSummary",
        name: "s",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getRicoFarming",
    outputs: [
      { internalType: "uint256", name: "shouldHave", type: "uint256" },
      { internalType: "uint256", name: "sent", type: "uint256" },
      { internalType: "uint256", name: "pending", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTopEarners",
    outputs: [
      { internalType: "address[8]", name: "addrs", type: "address[8]" },
      { internalType: "uint256[8]", name: "amounts", type: "uint256[8]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTopReferrers",
    outputs: [
      { internalType: "address[8]", name: "addrs", type: "address[8]" },
      { internalType: "uint256[8]", name: "counts", type: "uint256[8]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTotalReaders",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "user", type: "address" },
      { internalType: "uint8", name: "chapter", type: "uint8" },
    ],
    name: "getTrack1",
    outputs: [
      { internalType: "address", name: "currentReferrer", type: "address" },
      { internalType: "address[]", name: "referrals", type: "address[]" },
      { internalType: "bool", name: "blocked", type: "bool" },
      { internalType: "uint256", name: "reinvestCount", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "user", type: "address" },
      { internalType: "uint8", name: "chapter", type: "uint8" },
    ],
    name: "getTrack2",
    outputs: [
      { internalType: "address", name: "currentReferrer", type: "address" },
      { internalType: "address[]", name: "firstLine", type: "address[]" },
      { internalType: "address[]", name: "secondLine", type: "address[]" },
      { internalType: "bool", name: "blocked", type: "bool" },
      { internalType: "uint256", name: "reinvestCount", type: "uint256" },
      { internalType: "address", name: "closedPart", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "idToAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "readerAddr", type: "address" }],
    name: "isReaderExists",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "referrerAddress", type: "address" },
    ],
    name: "joinLibrary",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "lastReaderId",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "legacyClaimedOnV2",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "legacyRoyaltyClaimedV1",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "legacyRoyaltyPercentV1",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "legacyRoyaltySnapshot",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "legacyShareImported",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "legacySharePoints",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "legacyTrack1TotalCycles",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "legacyTrack1TotalEarned",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "legacyTrack2TotalCycles",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "legacyTrack2TotalEarned",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "libraryOpen",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "migrateSelf",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "migratedFromV1",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "migrationStatus",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "ownershipRenounced",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "platformFeeWalletA",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "platformFeeWalletB",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "platformFeeWalletC",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "readers",
    outputs: [
      { internalType: "uint256", name: "id", type: "uint256" },
      { internalType: "address", name: "referrer", type: "address" },
      { internalType: "uint256", name: "partnersCount", type: "uint256" },
      { internalType: "uint256", name: "royaltyPoints", type: "uint256" },
      { internalType: "uint256", name: "royaltyDebt", type: "uint256" },
      { internalType: "uint256", name: "royaltiesClaimedV2", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceContract",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "rewardToken",
    outputs: [{ internalType: "contract IERC20", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "ricoClaimed",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "ricoExpected",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "royaltyPot",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bool", name: "open_", type: "bool" }],
    name: "setLibraryOpen",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "topEarners",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "topEarnings",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "topReferralCounts",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "topReferrers",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalRoyalties",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalRoyaltyPoints",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "totalUnilevelEarned",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "usdt",
    outputs: [{ internalType: "contract IERC20", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "v1IdOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "viewLegacyClaimable",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "viewRicoPending",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "readerAddr", type: "address" }],
    name: "viewRoyaltyPercentV2",
    outputs: [{ internalType: "uint256", name: "percent", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "readerAddr", type: "address" }],
    name: "viewRoyaltyV2",
    outputs: [{ internalType: "uint256", name: "available", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];
export const USDT_ABI = [
  {
    constant: false,
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const RICO_STAKING_ABI = [{"inputs":[{"internalType":"address","name":"_ricoToken","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"EnforcedPause","type":"error"},{"inputs":[],"name":"ExpectedPause","type":"error"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"OwnableInvalidOwner","type":"error"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"OwnableUnauthorizedAccount","type":"error"},{"inputs":[],"name":"ReentrancyGuardReentrantCall","type":"error"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"SafeERC20FailedOperation","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"AirdropClaimed","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"bool","name":"enabled","type":"bool"}],"name":"AirdropStatusChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"KarmaEarned","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Paused","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newDuration","type":"uint256"}],"name":"Restaked","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"duration","type":"uint256"}],"name":"Staked","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Unpaused","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"totalReceived","type":"uint256"},{"indexed":false,"internalType":"bool","name":"early","type":"bool"}],"name":"Unstaked","type":"event"},{"inputs":[],"name":"AIRDROP_AMOUNT","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"AIRDROP_COOLDOWN","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"DEAD_ADDRESS","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MAX_AIRDROP_SUPPLY","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MIN_STAKE_HOLDER","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"accRewardPerShare","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"airdropEnabled","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"claimAirdrop","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"fundRewardPool","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint256","name":"_index","type":"uint256"}],"name":"getPendingLTB","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"lastAirdropClaim","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pause","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"paused","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_token","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"recoverToken","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_index","type":"uint256"},{"internalType":"uint256","name":"_newDuration","type":"uint256"}],"name":"restake","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"ricoToken","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"uint256","name":"_duration","type":"uint256"}],"name":"stake","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bool","name":"_status","type":"bool"}],"name":"toggleAirdrop","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"totalAirdropped","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalBurned","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalPenaltyDistributed","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalStaked","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"totalStakedBy","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"unpause","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_index","type":"uint256"}],"name":"unstake","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userKarma","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"userStakes","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"startTime","type":"uint256"},{"internalType":"uint256","name":"duration","type":"uint256"},{"internalType":"uint256","name":"apy","type":"uint256"},{"internalType":"uint256","name":"bonus","type":"uint256"},{"internalType":"uint256","name":"rewardDebt","type":"uint256"},{"internalType":"bool","name":"isActive","type":"bool"}],"stateMutability":"view","type":"function"}] as const;

export const CHAPTER_NAMES = {
  1: "Chapter 1: Crypto from Zero",
  3: "Chapter 3:Blockchain, Networks and How Value Moves ",
  2: "Chapter 2: Wallet keys and Self-Custody",
  4: "Chapter 4: Coins, Tokens and Tokenomics",
  5: "Chapter 5: Centralized Finance Vs Decentralized Finance",
  6: "Chapter 6: Smart Contract and the Age of Programmable Trust",
  7: "Chapter 7: Defi Protocol: Risk and Defence",
  8: "Chapter 8: Trading, Strategy & Market Intelligence",
  9: "Chapter 9: Rico Leap",
  10: "Chapter 10: Infinite Possibilities",
  11: "Chapter 11: The Matrix",
  12: "Chapter 12: Enlightenment",
};
export const BOOK_NAMES = {
  1: "selp book 1: How to Discover your life Purpose",
  2: "selp book 1: Why most People Never Build Wealth",
  3: "selp book 1: Why People get Rich doing one Thing and Lose at others",
};

const libraryContractAddressEnv =
  process.env.NEXT_PUBLIC_LIBRARY_CONTRACT_ADDRESS ||
  process.env.LIBRARY_CONTRACT_ADDRESS;

if (!libraryContractAddressEnv) {
  throw new Error(
    "Missing library contract address. Set NEXT_PUBLIC_LIBRARY_CONTRACT_ADDRESS.",
  );
}

export const LIBRARY_CONTRACT_ADDRESS =
  libraryContractAddressEnv as `0x${string}`;

export const LIBRARY_ABI = [
  {
    inputs: [
      { internalType: "address", name: "_usdt", type: "address" },
      { internalType: "address", name: "_rico", type: "address" },
      { internalType: "address", name: "_ricoMatrix", type: "address" },
      { internalType: "address", name: "_treasury", type: "address" },
      { internalType: "address", name: "_walletA", type: "address" },
      { internalType: "address", name: "_walletB", type: "address" },
    ],
    stateMutability: "payable",
    type: "constructor",
  },
  { inputs: [], name: "AlreadyOwned", type: "error" },
  { inputs: [], name: "AppealAlreadyPending", type: "error" },
  { inputs: [], name: "BookDoesNotExist", type: "error" },
  { inputs: [], name: "BookIsActive", type: "error" },
  { inputs: [], name: "BookNotAvailable", type: "error" },
  {
    inputs: [
      { internalType: "address", name: "sender", type: "address" },
      { internalType: "uint256", name: "balance", type: "uint256" },
      { internalType: "uint256", name: "needed", type: "uint256" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
    ],
    name: "ERC1155InsufficientBalance",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "approver", type: "address" }],
    name: "ERC1155InvalidApprover",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "idsLength", type: "uint256" },
      { internalType: "uint256", name: "valuesLength", type: "uint256" },
    ],
    name: "ERC1155InvalidArrayLength",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "operator", type: "address" }],
    name: "ERC1155InvalidOperator",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "receiver", type: "address" }],
    name: "ERC1155InvalidReceiver",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "sender", type: "address" }],
    name: "ERC1155InvalidSender",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "operator", type: "address" },
      { internalType: "address", name: "owner", type: "address" },
    ],
    name: "ERC1155MissingApprovalForAll",
    type: "error",
  },
  { inputs: [], name: "EnforcedPause", type: "error" },
  { inputs: [], name: "ExpectedPause", type: "error" },
  { inputs: [], name: "InvalidAddress", type: "error" },
  { inputs: [], name: "InvalidAmount", type: "error" },
  { inputs: [], name: "InvalidPrice", type: "error" },
  { inputs: [], name: "InvalidSplitConfiguration", type: "error" },
  { inputs: [], name: "MaxFeeExceeded", type: "error" },
  { inputs: [], name: "MaxVotesReached", type: "error" },
  { inputs: [], name: "NoAppealPending", type: "error" },
  { inputs: [], name: "NotAuthor", type: "error" },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "OwnableInvalidOwner",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "OwnableUnauthorizedAccount",
    type: "error",
  },
  { inputs: [], name: "ReentrancyGuardReentrantCall", type: "error" },
  {
    inputs: [{ internalType: "address", name: "token", type: "address" }],
    name: "SafeERC20FailedOperation",
    type: "error",
  },
  { inputs: [], name: "SameValue", type: "error" },
  { inputs: [], name: "Soulbound", type: "error" },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "bookId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "author",
        type: "address",
      },
    ],
    name: "AppealSubmitted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "operator",
        type: "address",
      },
      { indexed: false, internalType: "bool", name: "approved", type: "bool" },
    ],
    name: "ApprovalForAll",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "voter",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "author",
        type: "address",
      },
      { indexed: false, internalType: "bool", name: "like", type: "bool" },
      {
        indexed: false,
        internalType: "uint256",
        name: "ricoBurned",
        type: "uint256",
      },
    ],
    name: "AuthorVoted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "bookId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "author",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "price",
        type: "uint256",
      },
    ],
    name: "BookListed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "bookId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "payer",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "price",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "ricoBurned",
        type: "uint256",
      },
    ],
    name: "BookPurchased",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "bookId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "string",
        name: "status",
        type: "string",
      },
    ],
    name: "BookStatusChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "bookId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "string",
        name: "updateType",
        type: "string",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "newValue",
        type: "uint256",
      },
    ],
    name: "BookUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "bookId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "totalSales",
        type: "uint256",
      },
    ],
    name: "LeaderboardUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferStarted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "string", name: "param", type: "string" },
    ],
    name: "ParamsUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "Paused",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RoyaltyClaimed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RoyaltyDistributed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "operator",
        type: "address",
      },
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      {
        indexed: false,
        internalType: "uint256[]",
        name: "ids",
        type: "uint256[]",
      },
      {
        indexed: false,
        internalType: "uint256[]",
        name: "values",
        type: "uint256[]",
      },
    ],
    name: "TransferBatch",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "operator",
        type: "address",
      },
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      { indexed: false, internalType: "uint256", name: "id", type: "uint256" },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "TransferSingle",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "string", name: "value", type: "string" },
      { indexed: true, internalType: "uint256", name: "id", type: "uint256" },
    ],
    name: "URI",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "Unpaused",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "oldPoints",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "newPoints",
        type: "uint256",
      },
    ],
    name: "UserSynced",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "voter",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "bookId",
        type: "uint256",
      },
      { indexed: false, internalType: "bool", name: "like", type: "bool" },
      {
        indexed: false,
        internalType: "uint256",
        name: "ricoBurned",
        type: "uint256",
      },
    ],
    name: "VoteCast",
    type: "event",
  },
  {
    inputs: [],
    name: "DEAD_ADDRESS",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MAX_VOTES",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "accUsdtPerShare",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "acceptOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "author", type: "address" },
      { internalType: "address", name: "customPayoutWallet", type: "address" },
      { internalType: "string", name: "cid", type: "string" },
      { internalType: "uint256", name: "price", type: "uint256" },
    ],
    name: "adminListBook",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "appFeeRico",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "appFeeUsdt",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "appealFeeUsdt",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "bookId", type: "uint256" }],
    name: "appealStatus",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    name: "authorBooks",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "authorStats",
    outputs: [
      { internalType: "uint256", name: "score", type: "uint256" },
      { internalType: "uint256", name: "booksSold", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "address", name: "", type: "address" },
    ],
    name: "authorVoteCount",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "id", type: "uint256" },
    ],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address[]", name: "accounts", type: "address[]" },
      { internalType: "uint256[]", name: "ids", type: "uint256[]" },
    ],
    name: "balanceOfBatch",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "address", name: "", type: "address" },
    ],
    name: "bookVoteCount",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "books",
    outputs: [
      { internalType: "uint256", name: "price", type: "uint256" },
      { internalType: "address", name: "author", type: "address" },
      { internalType: "bool", name: "isFrozen", type: "bool" },
      { internalType: "bool", name: "isSuspended", type: "bool" },
      { internalType: "bool", name: "isBlacklisted", type: "bool" },
      { internalType: "bool", name: "isUnderAppeal", type: "bool" },
      { internalType: "address", name: "payoutWallet", type: "address" },
      { internalType: "uint32", name: "upVotes", type: "uint32" },
      { internalType: "uint32", name: "downVotes", type: "uint32" },
      { internalType: "string", name: "cid", type: "string" },
      { internalType: "uint256", name: "totalSales", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "bookId", type: "uint256" }],
    name: "buyBook",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "buyFeeRico",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "claimCommunityShare",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "author", type: "address" }],
    name: "getAuthorBooks",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "bookId", type: "uint256" }],
    name: "getBook",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "price", type: "uint256" },
          { internalType: "address", name: "author", type: "address" },
          { internalType: "bool", name: "isFrozen", type: "bool" },
          { internalType: "bool", name: "isSuspended", type: "bool" },
          { internalType: "bool", name: "isBlacklisted", type: "bool" },
          { internalType: "bool", name: "isUnderAppeal", type: "bool" },
          { internalType: "address", name: "payoutWallet", type: "address" },
          { internalType: "uint32", name: "upVotes", type: "uint32" },
          { internalType: "uint32", name: "downVotes", type: "uint32" },
          { internalType: "string", name: "cid", type: "string" },
          { internalType: "uint256", name: "totalSales", type: "uint256" },
        ],
        internalType: "struct RicoMatrixLibrary.Book",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTopSellingBooks",
    outputs: [
      { internalType: "uint256[5]", name: "ids", type: "uint256[5]" },
      { internalType: "uint256[5]", name: "sales", type: "uint256[5]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "bookId", type: "uint256" },
    ],
    name: "giftBook",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "user", type: "address" },
      { internalType: "uint256", name: "bookId", type: "uint256" },
    ],
    name: "hasAccess",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "address", name: "operator", type: "address" },
    ],
    name: "isApprovedForAll",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "cid", type: "string" },
      { internalType: "uint256", name: "price", type: "uint256" },
      { internalType: "address", name: "customPayoutWallet", type: "address" },
    ],
    name: "listBook",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "minVoteRico",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "nextBookId",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "paused",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "pendingOwner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenAddress", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "recoverDust",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "bookId", type: "uint256" },
      { internalType: "bool", name: "approved", type: "bool" },
    ],
    name: "resolveAppeal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "rico",
    outputs: [{ internalType: "contract IERC20", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "ricoMatrix",
    outputs: [
      { internalType: "contract IRicoMatrix", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256[]", name: "ids", type: "uint256[]" },
      { internalType: "uint256[]", name: "values", type: "uint256[]" },
      { internalType: "bytes", name: "data", type: "bytes" },
    ],
    name: "safeBatchTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "id", type: "uint256" },
      { internalType: "uint256", name: "value", type: "uint256" },
      { internalType: "bytes", name: "data", type: "bytes" },
    ],
    name: "safeTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "operator", type: "address" },
      { internalType: "bool", name: "approved", type: "bool" },
    ],
    name: "setApprovalForAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "bookId", type: "uint256" },
      { internalType: "bool", name: "frozen", type: "bool" },
      { internalType: "bool", name: "suspended", type: "bool" },
      { internalType: "bool", name: "blacklisted", type: "bool" },
    ],
    name: "setBookStatus",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_appUsdt", type: "uint256" },
      { internalType: "uint256", name: "_updateUsdt", type: "uint256" },
      { internalType: "uint256", name: "_appealUsdt", type: "uint256" },
    ],
    name: "setFees",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bool", name: "_state", type: "bool" }],
    name: "setPausable",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_author", type: "uint256" },
      { internalType: "uint256", name: "_pool", type: "uint256" },
      { internalType: "uint256", name: "_walletA", type: "uint256" },
      { internalType: "uint256", name: "_walletB", type: "uint256" },
    ],
    name: "setRevenueSplits",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_appRico", type: "uint256" },
      { internalType: "uint256", name: "_buyRico", type: "uint256" },
      { internalType: "uint256", name: "_voteRico", type: "uint256" },
    ],
    name: "setRicoFees",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "splitAuthor",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "splitPool",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "splitWalletA",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "splitWalletB",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes4", name: "interfaceId", type: "bytes4" }],
    name: "supportsInterface",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "syncRicoPoints",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "syncRicoPointsFor",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "topBookIds",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "treasury",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "bookId", type: "uint256" },
      { internalType: "uint256", name: "newPrice", type: "uint256" },
    ],
    name: "updateBookPrice",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "updateFeeUsdt",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "bookId", type: "uint256" },
      { internalType: "address", name: "newWallet", type: "address" },
    ],
    name: "updatePayoutWallet",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "bookId", type: "uint256" }],
    name: "uri",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "usdt",
    outputs: [{ internalType: "contract IERC20", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "userSnapshots",
    outputs: [
      { internalType: "uint256", name: "storedPoints", type: "uint256" },
      { internalType: "uint256", name: "rewardDebt", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "viewPendingShare",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "author", type: "address" },
      { internalType: "bool", name: "like", type: "bool" },
      { internalType: "uint256", name: "ricoAmount", type: "uint256" },
    ],
    name: "voteAuthor",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "bookId", type: "uint256" },
      { internalType: "bool", name: "like", type: "bool" },
      { internalType: "uint256", name: "ricoAmount", type: "uint256" },
    ],
    name: "voteBook",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "walletA",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "walletB",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
]    as const;

export const TRACK_NAMES = {
  1: "X3 Matrix Track",
  2: "X6 Matrix Track",
} as const;

export const SURVEY_ABI = [
  {
    inputs: [],
    name: "MIN_VOTE",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "proposalTitle",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "proposalDescription",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "paused",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "finalized",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "startTime",
    outputs: [{ internalType: "uint48", name: "", type: "uint48" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "endTime",
    outputs: [{ internalType: "uint48", name: "", type: "uint48" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "userVotes",
    outputs: [
      { internalType: "uint256", name: "yes", type: "uint256" },
      { internalType: "uint256", name: "no", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "ricoAmount", type: "uint256" }],
    name: "voteYes",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "ricoAmount", type: "uint256" }],
    name: "voteNo",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getResults",
    outputs: [
      { internalType: "uint256", name: "yesBurned", type: "uint256" },
      { internalType: "uint256", name: "noBurned", type: "uint256" },
      { internalType: "bool", name: "isFinalized", type: "bool" },
      { internalType: "bool", name: "didPass", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const VOTING_ABI = [{"inputs":[{"internalType":"address","name":"_usdtToken","type":"address"},{"internalType":"address","name":"_ricoToken","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"uint256","name":"required","type":"uint256"},{"internalType":"uint256","name":"available","type":"uint256"}],"name":"InsufficientContractInventory","type":"error"},{"inputs":[],"name":"InvalidAddress","type":"error"},{"inputs":[],"name":"InvalidAmount","type":"error"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"OwnableInvalidOwner","type":"error"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"OwnableUnauthorizedAccount","type":"error"},{"inputs":[],"name":"ReentrancyGuardReentrantCall","type":"error"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"SafeERC20FailedOperation","type":"error"},{"inputs":[],"name":"ZeroRewardCalculated","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"token","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"AssetsWithdrawn","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"voter","type":"address"},{"indexed":false,"internalType":"uint256","name":"usdtPaid","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"ricoReceived","type":"uint256"}],"name":"VoteDelegated","type":"event"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getDashboardData","outputs":[{"components":[{"internalType":"uint256","name":"totalUsdtCollected","type":"uint256"},{"internalType":"uint256","name":"totalRicoDistributed","type":"uint256"}],"internalType":"struct RicoQuantimaVoting.GlobalStats","name":"global","type":"tuple"},{"components":[{"internalType":"uint256","name":"usdtSpent","type":"uint256"},{"internalType":"uint256","name":"ricoReceived","type":"uint256"}],"internalType":"struct RicoQuantimaVoting.UserStats","name":"user","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"ricoRateBasis","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"ricoToken","outputs":[{"internalType":"contract IERC20Metadata","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalRicoDistributed","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalUsdtCollected","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"usdtRateBasis","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"usdtToken","outputs":[{"internalType":"contract IERC20Metadata","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userStats","outputs":[{"internalType":"uint256","name":"usdtSpent","type":"uint256"},{"internalType":"uint256","name":"ricoReceived","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_usdtAmount","type":"uint256"}],"name":"vote","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_token","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"withdrawAssets","outputs":[],"stateMutability":"nonpayable","type":"function"}] as const;
