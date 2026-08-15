"use client";

import { useQuantuMatrix } from "../../hooks/useQuantuMatrix";
import { ChapterCard } from "./ChapterCard";
import {
  CHAPTER_NAMES,
  RICO_CHAIN_CONFIG,
  USDT_ABI,
} from "../../utils/constants";
import { useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { toast } from "sonner";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useWriteContract,
} from "wagmi";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

type MatrixChapterState = {
  blocked?: boolean;
};

type FeeBreakdown = {
  totalUsd: string;
  tokenAmount: string;
  lzFee: string;
  bridgeFee: string;
  totalNativeFee: string;
  hubToken?: string;
  rail?: number;
  routeLabel: string;
};

type PurchaseRoute = "auto" | "hub" | "spoke";
type PaymentMode = "approve" | "permit2";

const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3" as const;
const WALLET_CONFIRM_TIMEOUT_MS = 45000;
const SIMULATION_TIMEOUT_MS = 12000;
const FALLBACK_REFERRER = "0xd7e5a3c00b7871f57aeff293f1844db466260f4f" as const;
const REFERRAL_STORAGE_KEY = "quantumatrix_referral_address";
const READER_NOT_REGISTERED_SELECTOR = "0x78b41a79";
const OUT_OF_SEQUENCE_SELECTOR = "0xbbd8e55a";
const INVALID_AMOUNT_SELECTOR = "0x2c5211c6";
const TOKEN_NOT_SUPPORTED_SELECTOR = "0x3dd1b305";

const toBigIntSafe = (value: unknown): bigint => {
  try {
    if (value === null || value === undefined || value === "") return BigInt(0);
    return BigInt(String(value));
  } catch {
    return BigInt(0);
  }
};

const formatNativeFee = (value: bigint) => {
  try {
    return formatUnits(value, 18);
  } catch {
    return "0";
  }
};

const rawAmountFrom18 = (amount: bigint, decimals: number) => {
  if (decimals === 18) return amount;
  if (decimals < 18) return amount / BigInt(10 ** (18 - decimals));
  return amount * BigInt(10 ** (decimals - 18));
};

const buildPermitNonce = () => {
  const random = crypto.getRandomValues(new Uint32Array(2));
  return (BigInt(random[0]) << BigInt(32)) + BigInt(random[1]) + BigInt(Date.now());
};

const withWalletConfirmTimeout = async <T,>(request: Promise<T>): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      request,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(
            new Error(
              "Wallet confirmation did not open. Please reopen your wallet and try again.",
            ),
          );
        }, WALLET_CONFIRM_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const withSimulationTimeout = async <T,>(request: Promise<T>): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      request,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(
            new Error(
              "We could not validate this purchase quickly enough. Reopen the wallet browser and try again.",
            ),
          );
        }, SIMULATION_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const formatTxError = (error: unknown, fallback: string) => {
  const message =
    (error as { shortMessage?: string; message?: string })?.shortMessage ||
    (error as { message?: string })?.message ||
    fallback;

  if (message.includes("execution reverted")) {
    if (message.includes(READER_NOT_REGISTERED_SELECTOR)) {
      return "Register your account first before buying later chapters.";
    }
    if (message.includes(OUT_OF_SEQUENCE_SELECTOR)) {
      return "Buy the next unlocked chapter in sequence first.";
    }
    if (message.includes(INVALID_AMOUNT_SELECTOR)) {
      return "The contract rejected the amount for this purchase.";
    }
    if (message.includes(TOKEN_NOT_SUPPORTED_SELECTOR)) {
      return "That payment token is not supported on the selected route.";
    }
    if (message.includes("ReaderNotRegistered")) {
      return "Register your account first before buying later chapters.";
    }
    if (message.includes("OutOfSequence")) {
      return "Buy the next unlocked chapter in sequence first.";
    }
    if (message.includes("PreviousChapterRequired")) {
      return "You need to buy the next unlocked chapter in sequence.";
    }
    if (message.includes("ChapterAlreadyUnlocked")) {
      return "That chapter is already unlocked on your account.";
    }
    if (message.includes("InvalidBatch")) {
      return "Choose a valid continuous chapter range.";
    }
    if (message.includes("TokenNotSupported")) {
      return "That payment token is not supported on the selected route.";
    }
    if (message.includes("InvalidAmount")) {
      return "The contract rejected the amount for this purchase.";
    }
  }

  if (message.includes("User rejected") || message.includes("denied")) {
    return "You cancelled the wallet request before it was confirmed.";
  }

  if (message.includes("insufficient funds")) {
    return "Your wallet does not have enough native gas for this transaction.";
  }

  if (message.includes("insufficient")) {
    return "Your wallet does not have enough balance or allowance for this transaction.";
  }

  if (message.toLowerCase().includes("could not validate this purchase quickly enough")) {
    return "The wallet browser did not finish validating the purchase. Reopen the wallet browser and try again.";
  }

  return message;
};

export const ChapterGrid = () => {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const {
    userData,
    loading,
    chapterPrices,
    usdtAllowance,
    usdtBalance,
    paymentTokenSymbol,
    paymentTokenMaxAllowance,
    paymentTokens,
    selectedPaymentTokenAddress,
    setSelectedPaymentTokenAddress,
    fetchAllTrack1Chapters,
    fetchAllTrack2Chapters,
    activeChain,
    isHubChain,
    dataScopeLabel,
    contractConfig,
    refetchAllData,
    activePaymentToken,
    permit2Allowance,
    joinLibrary,
  } = useQuantuMatrix() as ReturnType<typeof useQuantuMatrix> & {
    activePaymentToken?: {
      symbol: string;
      address: `0x${string}`;
      decimals: number;
    };
    permit2Allowance?: string;
    joinLibrary: (referrer: string) => Promise<`0x${string}`>;
  };
  const searchParams = useSearchParams();
  const urlReferral = searchParams.get("ref");

  const resolvedPaymentToken =
    activePaymentToken ||
    paymentTokens?.find(
      (token) =>
        token.address.toLowerCase() === selectedPaymentTokenAddress?.toLowerCase(),
    ) ||
    paymentTokens?.[0];

  const [currentlyApproving, setCurrentlyApproving] = useState<{
    track: number;
    chapter: number;
  } | null>(null);
  const [batchTrack, setBatchTrack] = useState(1);
  const [batchQuantity, setBatchQuantity] = useState(1);
  const [isBatchBuying, setIsBatchBuying] = useState(false);
  const [broadcastAcrossChains, setBroadcastAcrossChains] = useState(false);
  const [track1States, setTrack1States] = useState<Record<number, "active" | "blocked">>({});
  const [track2States, setTrack2States] = useState<Record<number, "active" | "blocked">>({});
  const [purchaseRoute, setPurchaseRoute] = useState<PurchaseRoute>("auto");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("approve");
  const [feeBreakdown, setFeeBreakdown] = useState<FeeBreakdown | null>(null);
  const [syncFeeRows, setSyncFeeRows] = useState<Array<{ name: string; eid: number; nativeFee: string }>>([]);
  const [syncing, setSyncing] = useState(false);
  const t = useTranslations("ChaptersPage.ChapterGrid");
  const effectiveReferralAddress = useMemo(() => {
    if (typeof window === "undefined") {
      return urlReferral || FALLBACK_REFERRER;
    }

    return (
      window.localStorage.getItem(REFERRAL_STORAGE_KEY) ||
      urlReferral ||
      FALLBACK_REFERRER
    );
  }, [urlReferral]);
  const resolvedRoute = useMemo<"hub" | "spoke">(() => {
    if (purchaseRoute === "hub") return "hub";
    if (purchaseRoute === "spoke") return "spoke";
    return isHubChain ? "hub" : "spoke";
  }, [isHubChain, purchaseRoute]);
  const resolvedUnlockedState = useMemo(() => {
    const hubTrack1Unlocked = userData?.hubTrack1Unlocked ?? userData?.track1Unlocked ?? 0;
    const hubTrack2Unlocked = userData?.hubTrack2Unlocked ?? userData?.track2Unlocked ?? 0;
    const localTrack1Unlocked = userData?.localTrack1Unlocked ?? userData?.track1Unlocked ?? 0;
    const localTrack2Unlocked = userData?.localTrack2Unlocked ?? userData?.track2Unlocked ?? 0;

    if (resolvedRoute === "hub") {
      return {
        track1Unlocked: hubTrack1Unlocked,
        track2Unlocked: hubTrack2Unlocked,
      };
    }

    return {
      track1Unlocked: localTrack1Unlocked,
      track2Unlocked: localTrack2Unlocked,
    };
  }, [
    resolvedRoute,
    userData?.hubTrack1Unlocked,
    userData?.hubTrack2Unlocked,
    userData?.localTrack1Unlocked,
    userData?.localTrack2Unlocked,
    userData?.track1Unlocked,
    userData?.track2Unlocked,
  ]);
  const nextAvailableChapter = useMemo(() => {
    const unlocked = batchTrack === 1
      ? resolvedUnlockedState.track1Unlocked
      : resolvedUnlockedState.track2Unlocked;
    return Math.min(12, Math.max(1, unlocked + 1));
  }, [batchTrack, resolvedUnlockedState]);
  const allChaptersUnlocked = nextAvailableChapter >= 12 && (
    batchTrack === 1
      ? resolvedUnlockedState.track1Unlocked >= 12
      : resolvedUnlockedState.track2Unlocked >= 12
  );
  const maxBatchQuantity = useMemo(
    () => Math.max(0, 12 - nextAvailableChapter + 1),
    [nextAvailableChapter],
  );
  const batchStart = nextAvailableChapter;
  const batchEnd = Math.min(12, batchStart + Math.max(0, batchQuantity - 1));

  useEffect(() => {
    const loadChapterStates = async () => {
      if (!userData?.exists) {
        setTrack1States({});
        setTrack2States({});
        return;
      }

      try {
        const [track1Data, track2Data] = await Promise.all([
          address && userData.track1Unlocked > 0
            ? fetchAllTrack1Chapters(address, userData.track1Unlocked)
            : Promise.resolve({}),
          address && userData.track2Unlocked > 0
            ? fetchAllTrack2Chapters(address, userData.track2Unlocked)
            : Promise.resolve({}),
        ]);

        const nextTrack1: Record<number, "active" | "blocked"> = {};
        Object.entries(track1Data || {}).forEach(([chapter, data]) => {
          const chapterData = data as MatrixChapterState;
          nextTrack1[Number(chapter)] = chapterData.blocked ? "blocked" : "active";
        });

        const nextTrack2: Record<number, "active" | "blocked"> = {};
        Object.entries(track2Data || {}).forEach(([chapter, data]) => {
          const chapterData = data as MatrixChapterState;
          nextTrack2[Number(chapter)] = chapterData.blocked ? "blocked" : "active";
        });

        setTrack1States(nextTrack1);
        setTrack2States(nextTrack2);
      } catch (error) {
        console.error("Failed to load chapter matrix states:", error);
      }
    };

    void loadChapterStates();
  }, [
    fetchAllTrack1Chapters,
    fetchAllTrack2Chapters,
    address,
    userData?.exists,
    userData?.track1Unlocked,
    userData?.track2Unlocked,
  ]);

  useEffect(() => {
    setBatchQuantity(1);
  }, [nextAvailableChapter, batchTrack]);

  useEffect(() => {
    let cancelled = false;

    const quotePurchase = async () => {
      if (!publicClient || !resolvedPaymentToken) {
        setFeeBreakdown(null);
        return;
      }

      try {
        if (resolvedRoute === "hub") {
          const totalUsd = Array.from(
            { length: Math.max(0, batchQuantity) },
            (_, index) => batchStart + index,
          ).reduce(
            (total, chapter) => total + toBigIntSafe(getChapterPrice(chapter)),
            BigInt(0),
          );
          const tokenAmount = rawAmountFrom18(totalUsd, resolvedPaymentToken.decimals);
          if (!cancelled) {
            setFeeBreakdown({
              totalUsd: formatUnits(totalUsd, 18),
              tokenAmount: formatUnits(tokenAmount, resolvedPaymentToken.decimals),
              lzFee: "0",
              bridgeFee: "0",
              totalNativeFee: "0",
              routeLabel: "Hub settlement on BSC",
            });
          }
          return;
        }

        if (isHubChain) {
          if (!cancelled) {
            setFeeBreakdown(null);
          }
          return;
        }

        const estimate = (await publicClient.readContract({
          ...contractConfig,
          functionName: "estimateChapterBuyCost",
          args: [resolvedPaymentToken.address, batchStart, batchEnd],
        })) as readonly [bigint, bigint, bigint, bigint, bigint, number, `0x${string}`];

        if (!cancelled) {
          setFeeBreakdown({
            totalUsd: formatUnits(estimate[0], 18),
            tokenAmount: formatUnits(estimate[1], resolvedPaymentToken.decimals),
            lzFee: formatNativeFee(estimate[2]),
            bridgeFee: formatNativeFee(estimate[3]),
            totalNativeFee: formatNativeFee(estimate[4]),
            rail: Number(estimate[5]),
            hubToken: estimate[6],
            routeLabel: `${activeChain.name} spoke settlement`,
          });
        }
      } catch (error) {
        console.error("Failed to quote purchase fees:", error);
        if (!cancelled) {
          setFeeBreakdown(null);
        }
      }
    };

    void quotePurchase();

    return () => {
      cancelled = true;
    };
  }, [
    activeChain.name,
    batchEnd,
    batchStart,
    batchQuantity,
    contractConfig,
    isHubChain,
    publicClient,
    resolvedPaymentToken,
    resolvedRoute,
  ]);

  useEffect(() => {
    let cancelled = false;

    const quoteSyncFees = async () => {
      if (!publicClient || !isHubChain) {
        setSyncFeeRows([]);
        return;
      }

      try {
        const targets = Object.values(RICO_CHAIN_CONFIG).filter(
          (chain) => chain.id !== activeChain.id,
        );
        const rows = await Promise.all(
          targets.map(async (chain) => {
            const nativeFee = (await publicClient.readContract({
              ...contractConfig,
              functionName: "quoteSyncFee",
              args: [chain.lzEid],
            })) as bigint;
            return {
              name: chain.name,
              eid: chain.lzEid,
              nativeFee: formatNativeFee(nativeFee),
            };
          }),
        );

        if (!cancelled) {
          setSyncFeeRows(rows);
        }
      } catch (error) {
        console.error("Failed to quote sync fees:", error);
        if (!cancelled) {
          setSyncFeeRows([]);
        }
      }
    };

    void quoteSyncFees();

    return () => {
      cancelled = true;
    };
  }, [activeChain.id, contractConfig, isHubChain, publicClient]);

  const handleRouteGuard = () => {
    if (resolvedRoute === "hub" && !isHubChain) {
      throw new Error("Switch your wallet to BNB Smart Chain to buy through the hub route.");
    }
    if (resolvedRoute === "spoke" && isHubChain) {
      throw new Error("Switch to Ethereum, Polygon, Base, or another spoke chain to use the spoke route.");
    }
  };

  const simulateHubWrite = async (
    functionName:
      | "joinLibraryHubWithPermit2"
      | "buyChapterBatchHub"
      | "buyChapterBatchHubWithPermit2",
    args:
      | readonly [`0x${string}`, number, number, bigint]
      | readonly [`0x${string}`, `0x${string}`, bigint, bigint, bigint, `0x${string}`]
      | readonly [`0x${string}`, number, number, number, bigint, bigint, bigint, `0x${string}`],
  ) => {
    if (!publicClient || !address || !walletClient) {
      throw new Error("Wallet client not available. Please connect your wallet.");
    }

    if (functionName === "buyChapterBatchHub") {
      const result = await withSimulationTimeout(publicClient.simulateContract({
        ...contractConfig,
        account: address,
        functionName,
        args: args as readonly [`0x${string}`, number, number, bigint],
      }));
      return result.request;
    }

    if (functionName === "joinLibraryHubWithPermit2") {
      const result = await withSimulationTimeout(publicClient.simulateContract({
        ...contractConfig,
        account: address,
        functionName,
        args: args as readonly [
          `0x${string}`,
          `0x${string}`,
          bigint,
          bigint,
          bigint,
          `0x${string}`,
        ],
      }));
      return result.request;
    }

    const result = await withSimulationTimeout(publicClient.simulateContract({
      ...contractConfig,
      account: address,
      functionName,
      args: args as readonly [
        `0x${string}`,
        number,
        number,
        number,
        bigint,
        bigint,
        bigint,
        `0x${string}`,
      ],
    }));
    return result.request;
  };

  const getPurchaseState = (track: number, chapter: number) => {
    const unlocked = track === 1
      ? resolvedUnlockedState.track1Unlocked
      : resolvedUnlockedState.track2Unlocked;

    if (!userData?.exists) {
      if (chapter === 1) {
        return {
          canAct: true,
          statusOverride: "Register first to unlock Chapter 1 on both tracks.",
          actionLabel: "Join Library",
        };
      }

      return {
        canAct: false,
        statusOverride: "Complete registration before buying later chapters.",
        actionLabel: "Join first",
      };
    }

    if (chapter <= unlocked) {
      return {
        canAct: false,
        statusOverride: undefined,
        actionLabel: undefined,
      };
    }

    if (chapter !== unlocked + 1) {
      return {
        canAct: false,
        statusOverride: "Buy the next unlocked chapter in sequence first.",
        actionLabel: "Locked in sequence",
      };
    }

    return {
      canAct: true,
      statusOverride: undefined,
      actionLabel: undefined,
    };
  };

  const approveForTarget = async (
    amount: string,
    target: "contract" | "permit2",
    label?: { track: number; chapter: number },
  ) => {
    const toastId = `chapter-approval-${target}`;
    if (!publicClient || !resolvedPaymentToken) {
      throw new Error("Wallet client not available. Please connect your wallet.");
    }

    const spender =
      target === "permit2"
        ? PERMIT2_ADDRESS
        : (contractConfig.address as `0x${string}`);
    const approvalAmount = paymentTokenMaxAllowance || "21000";
    const amountInUnits = parseUnits(approvalAmount, resolvedPaymentToken.decimals);

    try {
      if (label) {
        setCurrentlyApproving(label);
      }
      toast.loading("Open your wallet to approve", {
        id: toastId,
        description:
          target === "permit2"
            ? `Approve ${resolvedPaymentToken.symbol} for Permit2 once, then continue with hub purchases.`
            : `Approve ${resolvedPaymentToken.symbol} for the current purchase route.`,
      });
      const hash = await withWalletConfirmTimeout(
        writeContractAsync({
          address: resolvedPaymentToken.address,
          abi: USDT_ABI,
          functionName: "approve",
          args: [spender, amountInUnits],
        }),
      );
      toast.loading("Approval submitted", {
        id: toastId,
        description: `${resolvedPaymentToken.symbol} approval is waiting for confirmation.`,
      });
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });
      if (receipt.status !== "success") {
        throw new Error("Approval failed on-chain.");
      }
      toast.success("Approval confirmed", {
        id: toastId,
        description:
          target === "permit2"
            ? `Permit2 can now pull ${resolvedPaymentToken.symbol} for hub purchases.`
            : `${resolvedPaymentToken.symbol} is approved for the current contract route.`,
      });
      await refetchAllData({ showToast: false });
      return hash;
    } catch (error) {
      toast.error("Approval failed", {
        id: toastId,
        description: formatTxError(
          error,
          `Failed to approve ${resolvedPaymentToken.symbol}.`,
        ),
      });
      throw error;
    } finally {
      if (label) {
        setCurrentlyApproving(null);
      }
    }
  };

  const signPermit2 = async (requestedAmount: bigint) => {
    if (!walletClient || !resolvedPaymentToken || !address) {
      throw new Error("Wallet signing is unavailable. Reconnect your wallet and try again.");
    }

    const permitAmount = requestedAmount;
    const permitNonce = buildPermitNonce();
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);

    const signature = await walletClient.signTypedData({
      account: address,
      domain: {
        name: "Permit2",
        chainId: activeChain.id,
        verifyingContract: PERMIT2_ADDRESS,
      },
      primaryType: "PermitTransferFrom",
      types: {
        TokenPermissions: [
          { name: "token", type: "address" },
          { name: "amount", type: "uint256" },
        ],
        PermitTransferFrom: [
          { name: "permitted", type: "TokenPermissions" },
          { name: "spender", type: "address" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      },
      message: {
        permitted: {
          token: resolvedPaymentToken.address,
          amount: permitAmount,
        },
        spender: contractConfig.address,
        nonce: permitNonce,
        deadline,
      },
    } as never);

    return {
      permitAmount,
      permitNonce,
      deadline,
      signature,
    };
  };

  const syncAllSpokes = async () => {
    const toastId = "chapter-sync-all";
    if (!publicClient || !isHubChain) {
      throw new Error("Switch to BNB Smart Chain to sync your spoke status.");
    }

    setSyncing(true);
    try {
      for (const target of Object.values(RICO_CHAIN_CONFIG).filter(
        (chain) => chain.id !== activeChain.id,
      )) {
        toast.loading(`Preparing sync for ${target.name}`, {
          id: toastId,
          description: "Quoting live native gas from the hub contract.",
        });
        const nativeFee = (await publicClient.readContract({
          ...contractConfig,
          functionName: "quoteSyncFee",
          args: [target.lzEid],
        })) as bigint;

        toast.loading(`Confirm sync to ${target.name}`, {
          id: toastId,
          description: `Approve the sync transaction for ${target.name} in your wallet.`,
        });
        const hash = await withWalletConfirmTimeout(
          writeContractAsync({
            ...contractConfig,
            functionName: "syncUserToSpoke",
            args: [target.lzEid],
            value: nativeFee,
          }),
        );

        toast.loading(`Sync submitted for ${target.name}`, {
          id: toastId,
          description: `Waiting for on-chain confirmation on the BSC hub.`,
        });
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
        });

        if (receipt.status !== "success") {
          throw new Error(`Sync to ${target.name} failed on-chain.`);
        }
      }

      toast.success("Spoke sync completed", {
        id: toastId,
        description: "Your BSC hub status has been pushed to all configured spokes.",
      });
      await refetchAllData({ showToast: false });
    } catch (error) {
      toast.error("Sync failed", {
        id: toastId,
        description: formatTxError(
          error,
          "The sync transaction did not complete.",
        ),
      });
      throw error;
    } finally {
      setSyncing(false);
    }
  };

  const executePurchase = async (track: number, startChapter: number, endChapter: number) => {
    const toastId = `chapter-purchase-${track}-${startChapter}-${endChapter}`;
    if (!publicClient || !resolvedPaymentToken || !walletClient) {
      throw new Error("Wallet client not available. Please connect your wallet.");
    }
    const signingWalletClient = walletClient;

    handleRouteGuard();

    const isPermitPurchase = resolvedRoute === "hub" && paymentMode === "permit2";

    let hash: `0x${string}`;

    if (!userData?.exists) {
      if (startChapter !== 1 || endChapter !== 1) {
        throw new Error("Complete registration first before buying later chapters.");
      }

      if (isPermitPurchase) {
        const joinUsd = toBigIntSafe(getChapterPrice(1)) * BigInt(2);
        const requestedAmount = rawAmountFrom18(joinUsd, resolvedPaymentToken.decimals);

        toast.loading("Sign Permit2 approval", {
          id: toastId,
          description: "Your wallet will ask for a Permit2 signature before the join transaction.",
        });
        const permit = await signPermit2(requestedAmount);
        toast.loading("Validating registration", {
          id: toastId,
          description: "Checking the join transaction before opening your wallet prompt.",
        });
        const request = await simulateHubWrite("joinLibraryHubWithPermit2", [
          resolvedPaymentToken.address,
          effectiveReferralAddress as `0x${string}`,
          permit.permitAmount,
          permit.permitNonce,
          permit.deadline,
          permit.signature,
        ]);
        toast.loading("Confirm registration in wallet", {
          id: toastId,
          description: "Validation passed. Confirm the registration transaction now.",
        });
        hash = await withWalletConfirmTimeout(
          signingWalletClient.writeContract(request as any),
        );
      } else {
        hash = await joinLibrary(effectiveReferralAddress);
      }

      toast.loading("Registration submitted", {
        id: toastId,
        description: "Waiting for on-chain confirmation for your new account.",
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      if (receipt.status !== "success") {
        throw new Error("Registration failed on-chain.");
      }

      await refetchAllData({ showToast: false });
      toast.success("Registration confirmed", {
        id: toastId,
        description: "Your account is active and Chapter 1 is unlocked on both tracks.",
      });
      return hash;
    }

    toast.loading("Preparing purchase", {
      id: toastId,
      description:
        resolvedRoute === "hub"
          ? "Checking the hub route and building your purchase transaction."
          : `Quoting spoke settlement fees on ${activeChain.name}.`,
    });

    if (resolvedRoute === "spoke") {
      const estimate = (await publicClient.readContract({
        ...contractConfig,
        functionName: "estimateChapterBuyCost",
        args: [resolvedPaymentToken.address, startChapter, endChapter],
      })) as readonly [bigint, bigint, bigint, bigint, bigint, number, `0x${string}`];

      toast.loading("Confirm spoke purchase in wallet", {
        id: toastId,
        description: `This purchase will settle through the ${activeChain.name} spoke and back to the BSC hub.`,
      });
      hash = await withWalletConfirmTimeout(
        writeContractAsync({
          ...contractConfig,
          functionName: "buyChapterSpoke",
          args: [resolvedPaymentToken.address, track, startChapter, endChapter, estimate[2]],
          value: estimate[4],
        }),
      );
    } else {
      const totalUsd = Array.from(
        { length: Math.max(0, endChapter - startChapter + 1) },
        (_, index) => startChapter + index,
      ).reduce(
        (total, chapter) => total + toBigIntSafe(getChapterPrice(chapter)),
        BigInt(0),
      );
      const requestedAmount = rawAmountFrom18(totalUsd, resolvedPaymentToken.decimals);

      if (isPermitPurchase) {
        toast.loading("Sign Permit2 approval", {
          id: toastId,
          description: "Your wallet will ask for a Permit2 signature before the hub purchase transaction.",
        });
        const permit = await signPermit2(requestedAmount);
        toast.loading("Validating hub purchase", {
          id: toastId,
          description: "Checking the hub purchase before opening your wallet prompt.",
        });
        const request = await simulateHubWrite("buyChapterBatchHubWithPermit2", [
          resolvedPaymentToken.address,
          track,
          startChapter,
          endChapter,
          permit.permitAmount,
          permit.permitNonce,
          permit.deadline,
          permit.signature,
        ]);
        toast.loading("Confirm hub purchase in wallet", {
          id: toastId,
          description: "Validation passed. Confirm the hub purchase transaction now.",
        });
        hash = await withWalletConfirmTimeout(
          signingWalletClient.writeContract(request as any),
        );
      } else {
        toast.loading("Validating hub purchase", {
          id: toastId,
          description: "Checking the hub purchase before opening your wallet prompt.",
        });
        const request = await simulateHubWrite("buyChapterBatchHub", [
          resolvedPaymentToken.address,
          track,
          startChapter,
          BigInt(endChapter),
        ]);
        toast.loading("Confirm hub purchase in wallet", {
          id: toastId,
          description: "Validation passed. Approve the chapter purchase transaction on the BSC hub.",
        });
        hash = await withWalletConfirmTimeout(
          signingWalletClient.writeContract(request as any),
        );
      }
    }

    toast.loading("Purchase submitted", {
      id: toastId,
      description: `Waiting for on-chain confirmation for chapters ${startChapter}-${endChapter}.`,
    });
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 1,
    });

    if (receipt.status !== "success") {
      throw new Error("Purchase failed on-chain.");
    }

    if (broadcastAcrossChains && isHubChain) {
      toast.loading("Purchase confirmed, starting spoke sync", {
        id: toastId,
        description: "The hub purchase succeeded. Syncing your updated chapter status to the spoke networks now.",
      });
      await syncAllSpokes();
    } else {
      await refetchAllData({ showToast: false });
    }

    toast.success("Purchase confirmed", {
      id: toastId,
      description:
        startChapter === endChapter
          ? `Chapter ${startChapter} is now unlocked.`
          : `Chapters ${startChapter}-${endChapter} are now unlocked.`,
    });
    return hash;
  };

  const handleBuyChapter = async (track: number, chapter: number) => {
    try {
      await executePurchase(track, chapter, chapter);
    } catch (error: any) {
      console.error("Purchase failed:", error);
    }
  };

  const handleApproveUsdt = async (
    amount: string,
    track: number,
    chapter: number,
  ) => {
    try {
      const target = resolvedRoute === "hub" && paymentMode === "permit2" ? "permit2" : "contract";
      await approveForTarget(amount, target, { track, chapter });
    } catch (error: any) {
      console.error("Approval failed:", error);
    }
  };

  const handleBatchBuy = async () => {
    try {
      setIsBatchBuying(true);
      await executePurchase(batchTrack, batchStart, batchEnd);
    } catch (error: any) {
      console.error("Batch purchase failed:", error);
    } finally {
      setIsBatchBuying(false);
    }
  };

  const track1Chapters = Array.from({ length: 12 }, (_, i) => i + 1);
  const track2Chapters = Array.from({ length: 12 }, (_, i) => i + 1);

  const getChapterPrice = (chapter: number) => {
    if (!chapterPrices || chapterPrices.length === 0) return "0";
    return chapterPrices[chapter - 1]?.toString() || "0";
  };

  const needsApproval = (chapterPrice: string) => {
    if (!chapterPrice || chapterPrice === "0") return false;

    try {
      const priceNumber = parseFloat(formatUnits(toBigIntSafe(chapterPrice), 18));
      const allowanceNumber = parseFloat(usdtAllowance || "0");
      return allowanceNumber < priceNumber;
    } catch (error) {
      console.error("Error checking approval:", error);
      return false;
    }
  };

  const isProcessing = loading;
  const batchCost = Array.from(
    { length: Math.max(0, batchQuantity) },
    (_, index) => batchStart + index,
  ).reduce((total, chapter) => total + toBigIntSafe(getChapterPrice(chapter)), BigInt(0));
  const batchNeedsApproval =
    resolvedRoute === "hub" && paymentMode === "permit2"
      ? parseFloat(permit2Allowance || "0") < parseFloat(paymentTokenMaxAllowance || "21000")
      : needsApproval(batchCost.toString());
  const batchDisabled =
    isProcessing ||
    isBatchBuying ||
    !userData?.exists ||
    maxBatchQuantity === 0 ||
    batchStart < 1 ||
    batchEnd > 12 ||
    batchEnd < batchStart;

  const isChapterApproving = (track: number, chapter: number) => {
    return (
      currentlyApproving?.track === track &&
      currentlyApproving?.chapter === chapter
    );
  };

  const chapterCount = Math.max(0, batchQuantity);

  return (
    <div className="space-y-8">
      <div className="theme-panel-soft rounded-2xl p-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
            Purchase Route
          </p>
          <p className="text-base font-semibold text-slate-50">
            Connected chain: {activeChain.name}
          </p>
          <p className="text-sm text-slate-300">
            {isHubChain
              ? "You are buying directly on the BSC hub."
              : `You are buying on the ${activeChain.name} spoke. Your account data is still read from the BSC hub, and successful spoke purchases settle back to the hub automatically.`}
          </p>
          <p className="text-xs text-cyan-100/80">Data scope: {dataScopeLabel}</p>
        </div>
      </div>

      <div className="theme-panel-soft rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-slate-400">
              {t("balance.title")}
            </h4>
            <p className="text-lg font-bold text-slate-50">
              {Number(usdtBalance).toFixed(2) || "0"} {paymentTokenSymbol || t("balance.currency")}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-400">
              {t("balance.approved")}
            </h4>
            <p className="text-lg font-bold text-yellow-300">
              {Number(usdtAllowance).toFixed(2) || "0"} {paymentTokenSymbol || t("balance.currency")}
            </p>
          </div>
        </div>
        {parseFloat(usdtBalance || "0") === 0 && (
          <div className="mt-2 text-sm text-amber-400">
            {t("balance.warning")}
          </div>
        )}
      </div>

      <div className="theme-panel-soft rounded-2xl p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-100">Batch chapter purchase</h4>
            <p className="mt-1 text-xs text-slate-400">
              Buy continuous chapters in one transaction, see the exact route fee, and optionally sync all spokes after a hub purchase.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-6 lg:min-w-[760px]">
            {paymentTokens?.length > 1 && (
              <label className="text-xs text-slate-400">
                Token
                <select
                  value={selectedPaymentTokenAddress}
                  onChange={(event) =>
                    setSelectedPaymentTokenAddress(event.target.value as `0x${string}`)
                  }
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                >
                  {paymentTokens.map((token) => (
                    <option key={token.address} value={token.address}>
                      {token.symbol}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="text-xs text-slate-400">
              Route
              <select
                value={purchaseRoute}
                onChange={(event) => setPurchaseRoute(event.target.value as PurchaseRoute)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                <option value="auto">Auto ({isHubChain ? "hub" : "spoke"})</option>
                <option value="hub">Hub</option>
                <option value="spoke">Spoke</option>
              </select>
            </label>
            <label className="text-xs text-slate-400">
              Payment
              <select
                value={paymentMode}
                onChange={(event) => setPaymentMode(event.target.value as PaymentMode)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                <option value="approve">Approve + buy</option>
                <option value="permit2">Permit2</option>
              </select>
            </label>
            <label className="text-xs text-slate-400">
              Track
              <select
                value={batchTrack}
                onChange={(event) => setBatchTrack(Number(event.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                <option value={1}>X3</option>
                <option value={2}>X6</option>
              </select>
            </label>
            <div className="text-xs text-slate-400">
              From
              <div className="mt-1 flex h-[42px] items-center rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm font-semibold text-slate-100">
                Chapter {allChaptersUnlocked ? 12 : batchStart}
              </div>
            </div>
            <div className="text-xs text-slate-400">
              To
              <div className="mt-1 flex h-[42px] items-center rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm font-semibold text-slate-100">
                Chapter {allChaptersUnlocked ? 12 : batchEnd}
              </div>
            </div>
            <div className="sm:col-span-6 rounded-xl border border-slate-700 bg-slate-900 px-3 py-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Chapter quantity</span>
                <span>{chapterCount} chapter{chapterCount === 1 ? "" : "s"} selected</span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setBatchQuantity((current) => Math.max(1, current - 1))}
                  disabled={isProcessing || isBatchBuying || batchQuantity <= 1}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-lg font-bold text-slate-100 transition hover:border-yellow-400 hover:text-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  -
                </button>
                <div className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-center">
                  <p className="text-[0.68rem] uppercase tracking-[0.18em] text-slate-500">
                    Chapters to buy
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-100">
                    {chapterCount}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setBatchQuantity((current) =>
                      Math.min(maxBatchQuantity || 1, current + 1),
                    )
                  }
                  disabled={
                    isProcessing ||
                    isBatchBuying ||
                    maxBatchQuantity === 0 ||
                    batchQuantity >= maxBatchQuantity
                  }
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-lg font-bold text-slate-100 transition hover:border-yellow-400 hover:text-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
              </div>
              <input
                type="range"
                min={1}
                max={Math.max(1, maxBatchQuantity)}
                value={Math.min(batchQuantity, Math.max(1, maxBatchQuantity))}
                onChange={(event) =>
                  setBatchQuantity(
                    Math.min(
                      Math.max(1, Number(event.target.value)),
                      Math.max(1, maxBatchQuantity),
                    ),
                  )
                }
                disabled={maxBatchQuantity === 0}
                className="mt-4 w-full accent-yellow-400 disabled:cursor-not-allowed disabled:opacity-40"
              />
            </div>
            <label className="flex min-h-[58px] cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300 sm:col-span-3">
              <input
                type="checkbox"
                checked={broadcastAcrossChains}
                onChange={(event) =>
                  setBroadcastAcrossChains(event.target.checked)
                }
                className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-yellow-400 focus:ring-yellow-400"
              />
              <span>
                <span className="block font-semibold text-slate-100">
                  Sync all spokes after hub buy
                </span>
                <span className="block text-[0.68rem] text-slate-500">
                  Available only when the final purchase route is the BSC hub.
                </span>
              </span>
            </label>
            <button
              type="button"
              onClick={batchNeedsApproval ? () => approveForTarget(formatUnits(batchCost, 18), resolvedRoute === "hub" && paymentMode === "permit2" ? "permit2" : "contract") : handleBatchBuy}
              disabled={batchDisabled || allChaptersUnlocked}
              className="rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-3"
            >
              {isBatchBuying
                ? "Processing..."
                : allChaptersUnlocked
                  ? "All chapters unlocked"
                : batchNeedsApproval
                  ? resolvedRoute === "hub" && paymentMode === "permit2"
                    ? `Approve ${paymentTokenMaxAllowance || "21000"} ${paymentTokenSymbol || "USDT"} for Permit2`
                    : `Approve ${paymentTokenMaxAllowance || "21000"} ${paymentTokenSymbol || "USDT"}`
                  : broadcastAcrossChains && resolvedRoute === "hub"
                    ? `Buy ${batchStart}-${batchEnd} + Sync`
                    : `Buy ${batchStart}-${batchEnd}`}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-sm text-cyan-50">
            <p className="font-semibold">Fee preview</p>
            {feeBreakdown ? (
              <div className="mt-2 space-y-1 text-xs text-cyan-100/85">
                <p>Route: {feeBreakdown.routeLabel}</p>
                <p>Next unlockable chapter: {nextAvailableChapter}</p>
                <p>Total USD value: {Number(feeBreakdown.totalUsd).toFixed(2)}</p>
                <p>Token pull: {Number(feeBreakdown.tokenAmount).toFixed(6)} {resolvedPaymentToken?.symbol || paymentTokenSymbol}</p>
                <p>LayerZero fee: {feeBreakdown.lzFee}</p>
                <p>Bridge fee: {feeBreakdown.bridgeFee}</p>
                <p>Total native fee: {feeBreakdown.totalNativeFee}</p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-cyan-100/70">
                Connect the matching chain for the selected route to fetch an exact quote.
              </p>
            )}
          </div>
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3 text-sm text-yellow-50">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Manual sync</p>
                <p className="mt-1 text-xs text-yellow-100/70">
                  Use this when your user wants their latest BSC hub status pushed to each spoke manually.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void syncAllSpokes()}
                disabled={!isHubChain || syncing}
                className="rounded-xl border border-yellow-400/40 px-3 py-2 text-xs font-semibold text-yellow-100 transition hover:bg-yellow-400/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {syncing ? "Syncing..." : "Sync All Spokes"}
              </button>
            </div>
            <div className="mt-3 space-y-1 text-xs text-yellow-100/80">
              {syncFeeRows.length > 0 ? (
                syncFeeRows.map((row) => (
                  <p key={row.eid}>
                    {row.name}: {row.nativeFee} native
                  </p>
                ))
              ) : (
                <p>Switch to BNB Smart Chain to quote sync gas for each spoke.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-2xl font-bold text-white mb-6">{t("tracks.x3")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {track1Chapters.map((chapter) => {
            const chapterPrice = getChapterPrice(chapter);
            const purchaseState = getPurchaseState(1, chapter);
            const chapterNeedsApproval =
              resolvedRoute === "hub" && paymentMode === "permit2"
                ? purchaseState.canAct &&
                  parseFloat(permit2Allowance || "0") < parseFloat(paymentTokenMaxAllowance || "21000")
                : needsApproval(chapterPrice);

            return (
              <ChapterCard
                key={`track1-${chapter}`}
                track={1}
                chapter={chapter}
                title={CHAPTER_NAMES[chapter as keyof typeof CHAPTER_NAMES]}
                price={chapterPrice}
                isUnlocked={
                  userData?.exists && userData.track1Unlocked >= chapter
                }
                chapterState={track1States[chapter]}
                onPurchase={handleBuyChapter}
                onApprove={(amount) => handleApproveUsdt(amount, 1, chapter)}
                disabled={isProcessing || !purchaseState.canAct}
                needsApproval={chapterNeedsApproval}
                isApproving={isChapterApproving(1, chapter)}
                actionLabel={purchaseState.actionLabel}
                statusOverride={purchaseState.statusOverride}
              />
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-2xl font-bold text-white mb-6">{t("tracks.x6")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {track2Chapters.map((chapter) => {
            const chapterPrice = getChapterPrice(chapter);
            const purchaseState = getPurchaseState(2, chapter);
            const chapterNeedsApproval =
              resolvedRoute === "hub" && paymentMode === "permit2"
                ? purchaseState.canAct &&
                  parseFloat(permit2Allowance || "0") < parseFloat(paymentTokenMaxAllowance || "21000")
                : needsApproval(chapterPrice);

            return (
              <ChapterCard
                key={`track2-${chapter}`}
                track={2}
                chapter={chapter}
                title={CHAPTER_NAMES[chapter as keyof typeof CHAPTER_NAMES]}
                price={chapterPrice}
                isUnlocked={
                  userData?.exists && userData.track2Unlocked >= chapter
                }
                chapterState={track2States[chapter]}
                onPurchase={handleBuyChapter}
                onApprove={(amount) => handleApproveUsdt(amount, 2, chapter)}
                disabled={isProcessing || !purchaseState.canAct}
                needsApproval={chapterNeedsApproval}
                isApproving={isChapterApproving(2, chapter)}
                actionLabel={purchaseState.actionLabel}
                statusOverride={purchaseState.statusOverride}
              />
            );
          })}
        </div>
      </div>

      {(isProcessing || currentlyApproving || syncing) && (
        <div className="fixed bottom-4 right-4 rounded-lg border border-yellow-500/20 bg-[rgba(8,8,8,0.95)] p-4 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-400 border-t-transparent"></div>
            <span className="text-sm text-slate-300">
              {syncing
                ? "Syncing spoke state..."
                : currentlyApproving
                  ? t("transactionStatus.approving")
                  : t("transactionStatus.processing")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
