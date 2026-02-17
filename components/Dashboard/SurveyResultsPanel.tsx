import { useEffect, useMemo } from "react";
import { useBlockNumber, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { surveyContract } from "@/utils/contracts";
import { useTranslations } from "next-intl";

const toBigInt = (value: unknown) => {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string" && value !== "") return BigInt(value);
  return BigInt(0);
};

const formatTimeLeft = (seconds: number) => {
  if (seconds <= 0) return "0m";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

export const SurveyResultsPanel = ({
  onVote,
}: {
  onVote?: () => void;
}) => {
  const t = useTranslations("Dashboard.surveyResults");
  const { data: blockNumber } = useBlockNumber({ watch: true });

  const { data: surveyResults, refetch: refetchSurveyResults } = useReadContract({
    ...surveyContract,
    functionName: "getResults",
    query: { enabled: true },
  });

  const { data: endTime } = useReadContract({
    ...surveyContract,
    functionName: "endTime",
    query: { enabled: true },
  });

  const { data: startTime } = useReadContract({
    ...surveyContract,
    functionName: "startTime",
    query: { enabled: true },
  });

  const { data: paused, refetch: refetchPaused } = useReadContract({
    ...surveyContract,
    functionName: "paused",
    query: { enabled: true },
  });

  const { data: finalized, refetch: refetchFinalized } = useReadContract({
    ...surveyContract,
    functionName: "finalized",
    query: { enabled: true },
  });

  useEffect(() => {
    if (!blockNumber) return;
    refetchSurveyResults();
    refetchPaused();
    refetchFinalized();
  }, [blockNumber, refetchFinalized, refetchPaused, refetchSurveyResults]);

  const yesBurned = toBigInt(
    (surveyResults as any)?.yesBurned ?? (surveyResults as any)?.[0]
  );
  const noBurned = toBigInt(
    (surveyResults as any)?.noBurned ?? (surveyResults as any)?.[1]
  );
  const didPass =
    (surveyResults as any)?.didPass ?? (surveyResults as any)?.[3];

  const yesDisplay = formatUnits(yesBurned, 18);
  const noDisplay = formatUnits(noBurned, 18);
  const totalDisplay = formatUnits(yesBurned + noBurned, 18);

  const total = yesBurned + noBurned;
  const yesPct =
    total > BigInt(0)
      ? Number((yesBurned * BigInt(1000)) / total) / 10
      : 50;
  const noPct = Math.max(0, 100 - yesPct);

  const timeLeft = useMemo(() => {
    const end = Number(toBigInt(endTime));
    if (!end) return t("time.unknown");
    const now = Math.floor(Date.now() / 1000);
    const secondsLeft = end - now;
    return secondsLeft > 0 ? formatTimeLeft(secondsLeft) : t("time.ended");
  }, [endTime, t, blockNumber]);

  const isOpenForVoting = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    const start = Number(toBigInt(startTime));
    const end = Number(toBigInt(endTime));
    const inWindow = (!start || now >= start) && (!end || now <= end);
    return !paused && !finalized && inWindow;
  }, [endTime, finalized, paused, startTime, blockNumber]);

  return (
    <section className="rounded-3xl border border-yellow-500/25 bg-gradient-to-br from-slate-950 via-black to-slate-900 p-6 md:p-8 shadow-[0_30px_80px_rgba(0,0,0,0.8)]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-yellow-300/80 mb-2">
            {t("kicker")}
          </p>
          <h3 className="text-2xl md:text-3xl font-semibold text-slate-50">
            {t("title")}
          </h3>
          <p className="text-sm md:text-base text-slate-400 mt-2 max-w-2xl">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex flex-col items-start md:items-end gap-2">
          <span className="text-xs uppercase tracking-[0.25em] text-slate-400">
            {t("time.label")}
          </span>
          <span className="text-sm font-semibold text-yellow-200">
            {timeLeft}
          </span>
          <span className="text-[0.7rem] text-slate-500">
            {finalized
              ? didPass
                ? t("status.passed")
                : t("status.failed")
              : paused
              ? t("status.paused")
              : t("status.live")}
          </span>
          <button
            type="button"
            onClick={onVote}
            disabled={!isOpenForVoting}
            className={`mt-2 inline-flex items-center justify-center rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] transition-all ${
              isOpenForVoting
                ? "border border-yellow-400/60 bg-yellow-400/10 text-yellow-200 hover:bg-yellow-400/20"
                : "border border-slate-700 bg-slate-900/70 text-slate-500 cursor-not-allowed"
            }`}
          >
            {t("cta.vote")}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-slate-400 mb-3">
          <span>{t("chart.label")}</span>
          <span>{totalDisplay} RICO</span>
        </div>
        <div className="relative h-3 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-emerald-300"
            style={{ width: `${yesPct}%` }}
          />
          <div
            className="absolute inset-y-0 right-0 bg-gradient-to-r from-yellow-400 to-amber-300"
            style={{ width: `${noPct}%` }}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-3 mt-5">
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/80">
              {t("chart.yes")}
            </p>
            <p className="text-lg font-semibold text-emerald-100">
              {yesDisplay} RICO
            </p>
            <p className="text-xs text-emerald-200/70 mt-1">
              {yesPct.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-yellow-200/80">
              {t("chart.no")}
            </p>
            <p className="text-lg font-semibold text-yellow-100">
              {noDisplay} RICO
            </p>
            <p className="text-xs text-yellow-200/70 mt-1">
              {noPct.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300/80">
              {t("chart.total")}
            </p>
            <p className="text-lg font-semibold text-slate-100">
              {totalDisplay} RICO
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {t("chart.updated")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
