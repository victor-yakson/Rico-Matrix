import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { surveyContract } from "@/utils/contracts";
import { TOKEN_CONTRACT_ADDRESS, USDT_ABI } from "@/utils/constants";
import { useTranslations } from "next-intl";

const toBigInt = (value: unknown) => {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string" && value !== "") return BigInt(value);
  return BigInt(0);
};

export const SurveyModal = () => {
  const t = useTranslations("Dashboard.survey");
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [isOpen, setIsOpen] = useState(true);
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStage, setSubmitStage] = useState<
    "approving" | "submitting" | "confirming" | null
  >(null);

  const { data: userVotes, refetch: refetchUserVotes } = useReadContract({
    ...surveyContract,
    functionName: "userVotes",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: minVote } = useReadContract({
    ...surveyContract,
    functionName: "MIN_VOTE",
  });

  const { data: ricoAllowance, refetch: refetchAllowance } = useReadContract({
    address: TOKEN_CONTRACT_ADDRESS,
    abi: USDT_ABI,
    functionName: "allowance",
    args: address ? [address, surveyContract.address] : undefined,
    query: { enabled: !!address },
  });

  const { data: proposalTitle } = useReadContract({
    ...surveyContract,
    functionName: "proposalTitle",
  });

  const { data: proposalDescription } = useReadContract({
    ...surveyContract,
    functionName: "proposalDescription",
  });

  const { data: paused } = useReadContract({
    ...surveyContract,
    functionName: "paused",
  });

  const { data: finalized } = useReadContract({
    ...surveyContract,
    functionName: "finalized",
  });

  const { data: startTime } = useReadContract({
    ...surveyContract,
    functionName: "startTime",
  });

  const { data: endTime } = useReadContract({
    ...surveyContract,
    functionName: "endTime",
  });

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash ?? undefined,
      query: { enabled: !!txHash },
    });

  useEffect(() => {
    if (isConfirming) {
      setSubmitStage("confirming");
    }
  }, [isConfirming]);

  const yesVotes = toBigInt((userVotes as any)?.yes ?? (userVotes as any)?.[0]);
  const noVotes = toBigInt((userVotes as any)?.no ?? (userVotes as any)?.[1]);
  const hasVoted = yesVotes + noVotes > BigInt(0);

  const minVoteValue = useMemo(() => toBigInt(minVote), [minVote]);
  const minimumRequired = useMemo(() => {
    const five = parseUnits("5", 18);
    return minVoteValue > five ? minVoteValue : five;
  }, [minVoteValue]);
  const minVoteDisplay =
    minimumRequired > BigInt(0) ? formatUnits(minimumRequired, 18) : "0";

  const now = Math.floor(Date.now() / 1000);
  const start = Number(toBigInt(startTime));
  const end = Number(toBigInt(endTime));
  const isInWindow = (!start || now >= start) && (!end || now <= end);
  const isOpenForVoting = !paused && !finalized && isInWindow;

  const parsedAmount = useMemo(() => {
    if (!amount) return null;
    try {
      return parseUnits(amount, 18);
    } catch {
      return null;
    }
  }, [amount]);

  const isBelowMin =
    parsedAmount && minimumRequired > BigInt(0)
      ? parsedAmount < minimumRequired
      : false;

  useEffect(() => {
    if (!amount && minimumRequired > BigInt(0)) {
      setAmount(formatUnits(minimumRequired, 18));
    }
  }, [amount, minimumRequired]);

  useEffect(() => {
    if (hasVoted) {
      setIsOpen(false);
    }
  }, [hasVoted]);

  useEffect(() => {
    if (isConfirmed) {
      refetchUserVotes();
      setIsOpen(false);
    }
  }, [isConfirmed, refetchUserVotes]);

  const handleVote = async (vote: "yes" | "no") => {
    setError(null);
    setIsSubmitting(true);
    setSubmitStage("submitting");
    if (!parsedAmount) {
      setError(t("errors.invalidAmount"));
      setIsSubmitting(false);
      setSubmitStage(null);
      return;
    }
    if (isBelowMin || parsedAmount < minimumRequired) {
      setError(t("errors.belowMinimum", { amount: minVoteDisplay }));
      setIsSubmitting(false);
      setSubmitStage(null);
      return;
    }
    if (!writeContractAsync) {
      setIsSubmitting(false);
      setSubmitStage(null);
      return;
    }

    try {
      const allowanceValue = toBigInt(ricoAllowance);
      if (allowanceValue < parsedAmount) {
        setSubmitStage("approving");
        const approveHash = await writeContractAsync({
          address: TOKEN_CONTRACT_ADDRESS,
          abi: USDT_ABI,
          functionName: "approve",
          args: [surveyContract.address, parsedAmount],
        });
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }
        await refetchAllowance();
      }

      setSubmitStage("submitting");
      const hash = await writeContractAsync({
        ...surveyContract,
        functionName: vote === "yes" ? "voteYes" : "voteNo",
        args: [parsedAmount],
      });
      setTxHash(hash);
      setIsSubmitting(false);
    } catch (err: any) {
      setError(err?.shortMessage || err?.message || t("errors.failed"));
      setIsSubmitting(false);
      setSubmitStage(null);
    }
  };

  if (!isConnected || !isOpen || hasVoted) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-8">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl rounded-3xl border border-yellow-500/25 bg-gradient-to-br from-slate-950 via-black to-slate-900 p-6 md:p-8 shadow-[0_40px_120px_rgba(0,0,0,0.8)]">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-yellow-300/80 mb-2">
              {t("kicker")}
            </p>
            <h2 className="text-2xl md:text-3xl font-semibold text-slate-50">
              {proposalTitle ? String(proposalTitle) : t("title")}
            </h2>
            <p className="text-sm md:text-base text-slate-400 mt-2">
              {proposalDescription ? String(proposalDescription) : t("description")}
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-200 transition"
            aria-label={t("close")}
          >
            ✕
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs md:text-sm text-slate-300 mb-6">
          {t("note")}
        </div>

        <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr] mb-6">
          <div>
            <label className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-2 block">
              {t("amount.label")}
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-full rounded-xl border border-yellow-500/20 bg-black/60 px-4 py-3 text-base text-slate-100 outline-none focus:border-yellow-400/60 focus:ring-2 focus:ring-yellow-400/20"
              placeholder={t("amount.placeholder")}
              min={minVoteDisplay}
            />
            <p className="text-xs text-slate-500 mt-2">
              {t("amount.minimum", { amount: minVoteDisplay })}
            </p>
          </div>
          <div className="rounded-2xl border border-yellow-500/20 bg-black/60 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.25em] text-yellow-300/80 mb-2">
              {t("status.label")}
            </p>
            <p className="text-sm text-slate-300">
              {finalized
                ? t("status.finalized")
                : paused
                ? t("status.paused")
                : isOpenForVoting
                ? t("status.open")
                : t("status.closed")}
            </p>
            <p className="text-xs text-slate-500 mt-3">{t("status.disclaimer")}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 relative">
          <button
            onClick={() => handleVote("yes")}
            disabled={!isOpenForVoting || isConfirming || isSubmitting}
            className={`flex-1 rounded-xl px-5 py-3 text-sm md:text-base font-semibold transition-all ${
              isOpenForVoting && !isConfirming && !isSubmitting
                ? "bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-300 text-black shadow-[0_0_18px_rgba(16,185,129,0.7)] hover:brightness-110"
                : "cursor-not-allowed border border-slate-700 bg-slate-900/70 text-slate-500"
            }`}
          >
            {isConfirming || isSubmitting
              ? submitStage === "approving"
                ? t("buttons.approving")
                : submitStage === "submitting"
                ? t("buttons.submitting")
                : submitStage === "confirming"
                ? t("buttons.confirming")
                : t("buttons.processing")
              : t("buttons.yes")}
          </button>
          <button
            onClick={() => handleVote("no")}
            disabled={!isOpenForVoting || isConfirming || isSubmitting}
            className={`flex-1 rounded-xl px-5 py-3 text-sm md:text-base font-semibold transition-all ${
              isOpenForVoting && !isConfirming && !isSubmitting
                ? "bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-300 text-black shadow-[0_0_18px_rgba(245,158,11,0.7)] hover:brightness-110"
                : "cursor-not-allowed border border-slate-700 bg-slate-900/70 text-slate-500"
            }`}
          >
            {isConfirming || isSubmitting
              ? submitStage === "approving"
                ? t("buttons.approving")
                : submitStage === "submitting"
                ? t("buttons.submitting")
                : submitStage === "confirming"
                ? t("buttons.confirming")
                : t("buttons.processing")
              : t("buttons.no")}
          </button>
          {(isConfirming || isSubmitting) && (
            <div className="absolute inset-0 rounded-xl bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-yellow-200/90">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-300 border-t-transparent" />
                {submitStage === "approving"
                  ? t("buttons.approving")
                  : submitStage === "submitting"
                  ? t("buttons.submitting")
                  : submitStage === "confirming"
                  ? t("buttons.confirming")
                  : t("buttons.processing")}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-[0.7rem] text-slate-500">
          {t("footer")}
        </div>
      </div>
    </div>
  );
};
