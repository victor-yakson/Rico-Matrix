import React from "react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { useTranslations } from "next-intl";

interface LeaderboardsProps {
  topEarners?: [string[], string[]] | null;
  topReferrers?: [string[], string[]] | null;
}

const Leaderboards = ({ topEarners, topReferrers }: LeaderboardsProps) => {
  const { address: userAddress } = useAccount();
  const t = useTranslations("Dashboard.leaderboards");

  // Address to remove from leaderboards
  const ADDRESS_TO_REMOVE = "0xf2a8728B61f7a924fe7C2A208dc94BCCFc369cFc";

  // Parse leaderboard data from props with type safety
  const leaderboardAddresses = topEarners?.[0] || [];
  const leaderboardEarnings = topEarners?.[1] || [];
  const referrerAddresses = topReferrers?.[0] || [];
  const referrerCounts = topReferrers?.[1] || [];

  // Filter out the address to remove from top earners
  const filteredTopEarners = leaderboardAddresses.reduce((acc: { addresses: string[], earnings: string[] }, address, index) => {
    if (address && address.toLowerCase() !== ADDRESS_TO_REMOVE.toLowerCase()) {
      acc.addresses.push(address);
      acc.earnings.push(leaderboardEarnings[index] || "0");
    }
    return acc;
  }, { addresses: [], earnings: [] });

  // Filter out the address to remove from top referrers
  const filteredTopReferrers = referrerAddresses.reduce((acc: { addresses: string[], counts: string[] }, address, index) => {
    if (address && address.toLowerCase() !== ADDRESS_TO_REMOVE.toLowerCase()) {
      acc.addresses.push(address);
      acc.counts.push(referrerCounts[index] || "0");
    }
    return acc;
  }, { addresses: [], counts: [] });

  // Use filtered data
  const filteredLeaderboardAddresses = filteredTopEarners.addresses;
  const filteredLeaderboardEarnings = filteredTopEarners.earnings;
  const filteredReferrerAddresses = filteredTopReferrers.addresses;
  const filteredReferrerCounts = filteredTopReferrers.counts;

  // Check if we have leaderboard data after filtering
  const hasTopEarners = filteredLeaderboardAddresses && filteredLeaderboardAddresses.length > 0;
  const hasTopReferrers = filteredReferrerAddresses && filteredReferrerAddresses.length > 0;

  // Calculate total earnings for top 10 (after filtering)
  const totalTop10Earnings = hasTopEarners
    ? filteredLeaderboardEarnings
        .slice(0, 10)
        .reduce((sum: bigint, earning: string) => {
          return sum + BigInt(earning || "0");
        }, BigInt(0))
    : BigInt(0);

  const formattedTotalEarnings = formatUnits(totalTop10Earnings, 18);

  // Calculate total referrals for top 10 (after filtering)
  const totalTop10Referrals = hasTopReferrers
    ? filteredReferrerCounts.slice(0, 10).reduce((sum: bigint, count: string) => {
        return sum + BigInt(count || "0");
      }, BigInt(0))
    : BigInt(0);

  // Helper function to format address
  const formatAddress = (address: string) => {
    if (!address) return "--";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Helper function to format USDT amount
  const formatUSDT = (amount: string) => {
    const formatted = formatUnits(BigInt(amount || "0"), 18);
    return parseFloat(formatted).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // No leaderboard data at all (after filtering)
  if (!hasTopEarners && !hasTopReferrers) {
    return (
      <div className="mb-8 md:mb-10 lg:mb-12">
        <h2 className="text-2xl font-bold text-slate-50 mb-6 text-center">
          {t("title")}
        </h2>
        <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-950 to-slate-900/90 p-8 text-center shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-sm">
          <div className="text-5xl mb-4">🏆</div>
          <h3 className="text-xl font-bold text-slate-300 mb-2">
            {t("empty.title")}
          </h3>
          <p className="text-slate-500 mb-4">
            {t("empty.message")}
          </p>
          <div className="text-sm text-slate-600">
            {t("empty.motivation")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 md:mb-10 lg:mb-12">
      <h2 className="text-2xl font-bold text-slate-50 mb-6 text-center">
        {t("title")}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Earners Leaderboard */}
        <div className="rounded-2xl border border-yellow-500/40 bg-gradient-to-br from-slate-950 to-slate-900/90 p-5 md:p-6 shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-sm">
          <h3 className="text-xl font-bold text-yellow-300 mb-4 flex items-center gap-2">
            <span className="text-2xl">💰</span> {t("topEarners.title")}
          </h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {hasTopEarners ? (
              filteredLeaderboardAddresses.map(
                (leaderAddress: string, index: number) => {
                  if (
                    !leaderAddress ||
                    leaderAddress === "0x0000000000000000000000000000000000000000"
                  ) {
                    return null;
                  }

                  const isCurrentUser =
                    leaderAddress.toLowerCase() === userAddress?.toLowerCase();
                  const earnings = filteredLeaderboardEarnings[index] || "0";

                  return (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                        isCurrentUser
                          ? "bg-gradient-to-r from-cyan-900/40 to-slate-900/60 border border-cyan-500/30"
                          : "bg-slate-900/60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                        ${
                          index === 0
                            ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                            : index === 1
                            ? "bg-slate-600/20 text-slate-300 border border-slate-600/30"
                            : index === 2
                            ? "bg-amber-700/20 text-amber-300 border border-amber-700/30"
                            : "bg-slate-800/20 text-slate-400 border border-slate-700/30"
                        }`}
                        >
                          #{index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200">
                            {formatAddress(leaderAddress)}
                          </p>
                          {isCurrentUser && (
                            <span className="text-xs text-cyan-400 font-semibold">
                              {t("topEarners.yourBadge")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-yellow-300">
                          {formatUSDT(earnings)} USDT
                        </p>
                        {index === 0 && hasTopEarners && (
                          <p className="text-xs text-yellow-500/70 mt-1">
                            {t("topEarners.topEarnerBadge")}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }
              )
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">💰</div>
                <p className="text-slate-500">
                  {t("topEarners.noData.message")}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  {t("topEarners.noData.motivation")}
                </p>
              </div>
            )}
          </div>

          {/* {hasTopEarners && (
            <div className="mt-4 pt-4 border-t border-slate-800/50">
              <div className="flex justify-between text-sm text-slate-500">
                <span>{t("topEarners.total")}</span>
                <span className="text-yellow-300 font-semibold">
                  {parseFloat(formattedTotalEarnings).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  USDT
                </span>
              </div>
            </div>
          )} */}
        </div>

        {/* Top Referrers Leaderboard */}
        <div className="rounded-2xl border border-purple-500/40 bg-gradient-to-br from-slate-950 to-slate-900/90 p-5 md:p-6 shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-sm">
          <h3 className="text-xl font-bold text-purple-300 mb-4 flex items-center gap-2">
            <span className="text-2xl">👥</span> {t("topReferrers.title")}
          </h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {hasTopReferrers ? (
              filteredReferrerAddresses.map(
                (referrerAddress: string, index: number) => {
                  if (
                    !referrerAddress ||
                    referrerAddress === "0x0000000000000000000000000000000000000000"
                  ) {
                    return null;
                  }

                  const isCurrentUser =
                    referrerAddress.toLowerCase() === userAddress?.toLowerCase();
                  const partnerCount = filteredReferrerCounts[index] || "0";

                  return (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                        isCurrentUser
                          ? "bg-gradient-to-r from-cyan-900/40 to-slate-900/60 border border-cyan-500/30"
                          : "bg-slate-900/60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                        ${
                          index === 0
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            : index === 1
                            ? "bg-slate-600/20 text-slate-300 border border-slate-600/30"
                            : index === 2
                            ? "bg-purple-700/20 text-purple-300 border border-purple-700/30"
                            : "bg-slate-800/20 text-slate-400 border border-slate-700/30"
                        }`}
                        >
                          #{index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200">
                            {formatAddress(referrerAddress)}
                          </p>
                          {isCurrentUser && (
                            <span className="text-xs text-cyan-400 font-semibold">
                              {t("topReferrers.yourBadge")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-purple-300">
                          {parseInt(partnerCount.toString()).toLocaleString()}{" "}
                          {t("topReferrers.partners")}
                        </p>
                        {index === 0 && hasTopReferrers && (
                          <p className="text-xs text-purple-500/70 mt-1">
                            {t("topReferrers.topReferrerBadge")}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }
              )
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">👥</div>
                <p className="text-slate-500">
                  {t("topReferrers.noData.message")}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  {t("topReferrers.noData.motivation")}
                </p>
              </div>
            )}
          </div>

          {/* {hasTopReferrers && (
            <div className="mt-4 pt-4 border-t border-slate-800/50">
              <div className="flex justify-between text-sm text-slate-500">
                <span>{t("topReferrers.total")}</span>
                <span className="text-purple-300 font-semibold">
                  {parseInt(totalTop10Referrals.toString()).toLocaleString()}
                </span>
              </div>
            </div>
          )} */}
        </div>
      </div>

      {/* Legend/Explanation */}
      <div className="mt-6 text-center">
        <div className="inline-flex items-center gap-4 text-sm text-slate-500 bg-slate-900/40 px-4 py-2 rounded-full">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/30"></div>
            <span>{t("legend.firstPlace")}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-slate-600/20 border border-slate-600/30"></div>
            <span>{t("legend.secondPlace")}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-amber-700/20 border border-amber-700/30"></div>
            <span>{t("legend.thirdPlace")}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-cyan-500/20 border border-cyan-500/30"></div>
            <span>{t("legend.yourPosition")}</span>
          </div>
        </div>
        <p className="text-xs text-slate-600 mt-3">
          {t("legend.note")}
        </p>
      </div>
    </div>
  );
};

export default Leaderboards;