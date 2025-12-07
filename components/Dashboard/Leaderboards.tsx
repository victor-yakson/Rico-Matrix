import React from "react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";

interface LeaderboardsProps {
  topEarners?: [string[], string[]] | null;
  topReferrers?: [string[], string[]] | null;
}

const Leaderboards = ({ topEarners, topReferrers }: LeaderboardsProps) => {
  const { address: userAddress } = useAccount(); // Renamed to userAddress

  // Parse leaderboard data from props with type safety
  const leaderboardAddresses = topEarners?.[0] || [];
  const leaderboardEarnings = topEarners?.[1] || [];
  const referrerAddresses = topReferrers?.[0] || [];
  const referrerCounts = topReferrers?.[1] || [];

  // Check if we have leaderboard data
  const hasTopEarners = leaderboardAddresses && leaderboardAddresses.length > 0;
  const hasTopReferrers = referrerAddresses && referrerAddresses.length > 0;

  // Calculate total earnings for top 10
  const totalTop10Earnings = hasTopEarners
    ? leaderboardEarnings
        .slice(0, 10)
        .reduce((sum: bigint, earning: string) => {
          return sum + BigInt(earning || "0");
        }, BigInt(0))
    : BigInt(0);

  const formattedTotalEarnings = formatUnits(totalTop10Earnings, 18);

  // Calculate total referrals for top 10
  const totalTop10Referrals = hasTopReferrers
    ? referrerCounts.slice(0, 10).reduce((sum: bigint, count: string) => {
        return sum + BigInt(count || "0");
      }, BigInt(0))
    : BigInt(0);

  // No leaderboard data at all
  if (!hasTopEarners && !hasTopReferrers) {
    return (
      <div className="mb-8 md:mb-10 lg:mb-12">
        <h2 className="text-2xl font-bold text-slate-50 mb-6 text-center">
          🏆 Lifetime Leaderboards
        </h2>
        <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-950 to-slate-900/90 p-8 text-center shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-sm">
          <div className="text-5xl mb-4">🏆</div>
          <h3 className="text-xl font-bold text-slate-300 mb-2">
            Leaderboards Empty
          </h3>
          <p className="text-slate-500 mb-4">
            Leaderboards will populate as users start earning and referring
            others.
          </p>
          <div className="text-sm text-slate-600">
            Be the first to appear on the leaderboard!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 md:mb-10 lg:mb-12">
      <h2 className="text-2xl font-bold text-slate-50 mb-6 text-center">
        🏆 Lifetime Leaderboards
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Earners Leaderboard */}
        <div className="rounded-2xl border border-yellow-500/40 bg-gradient-to-br from-slate-950 to-slate-900/90 p-5 md:p-6 shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-sm">
          <h3 className="text-xl font-bold text-yellow-300 mb-4 flex items-center gap-2">
            <span className="text-2xl">💰</span> Top Earners (USDT)
          </h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {hasTopEarners ? (
              leaderboardAddresses.map(
                (leaderAddress: string, index: number) => {
                  if (
                    !leaderAddress ||
                    leaderAddress ===
                      "0x0000000000000000000000000000000000000000"
                  ) {
                    return null;
                  }

                  // Check if this address is the current user - FIXED: use userAddress
                  const isCurrentUser =
                    leaderAddress.toLowerCase() === userAddress?.toLowerCase();
                  const earnings = leaderboardEarnings[index] || "0";
                  const formattedEarnings = formatUnits(BigInt(earnings), 18);

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
                            {leaderAddress
                              ? `${leaderAddress.slice(
                                  0,
                                  6
                                )}...${leaderAddress.slice(-4)}`
                              : "--"}
                          </p>
                          {isCurrentUser && (
                            <span className="text-xs text-cyan-400 font-semibold">
                              (You)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-yellow-300">
                          {parseFloat(formattedEarnings).toLocaleString(
                            "en-US",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}{" "}
                          USDT
                        </p>
                        {index === 0 && hasTopEarners && (
                          <p className="text-xs text-yellow-500/70 mt-1">
                            🥇 Top Earner
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
                <p className="text-slate-500">No earnings data yet</p>
                <p className="text-sm text-slate-600 mt-1">
                  Start earning USDT to appear here!
                </p>
              </div>
            )}
          </div>

          {hasTopEarners && (
            <div className="mt-4 pt-4 border-t border-slate-800/50">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Total Top 10 Earnings:</span>
                <span className="text-yellow-300 font-semibold">
                  {parseFloat(formattedTotalEarnings).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  USDT
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Top Referrers Leaderboard */}
        <div className="rounded-2xl border border-purple-500/40 bg-gradient-to-br from-slate-950 to-slate-900/90 p-5 md:p-6 shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-sm">
          <h3 className="text-xl font-bold text-purple-300 mb-4 flex items-center gap-2">
            <span className="text-2xl">👥</span> Top Referrers
          </h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {hasTopReferrers ? (
              referrerAddresses.map(
                (referrerAddress: string, index: number) => {
                  if (
                    !referrerAddress ||
                    referrerAddress ===
                      "0x0000000000000000000000000000000000000000"
                  ) {
                    return null;
                  }

                  // Check if this address is the current user - FIXED: use userAddress
                  const isCurrentUser =
                    referrerAddress.toLowerCase() ===
                    userAddress?.toLowerCase();
                  const partnerCount = referrerCounts[index] || "0";

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
                            {referrerAddress
                              ? `${referrerAddress.slice(
                                  0,
                                  6
                                )}...${referrerAddress.slice(-4)}`
                              : "--"}
                          </p>
                          {isCurrentUser && (
                            <span className="text-xs text-cyan-400 font-semibold">
                              (You)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-purple-300">
                          {parseInt(partnerCount.toString()).toLocaleString()}{" "}
                          Partners
                        </p>
                        {index === 0 && hasTopReferrers && (
                          <p className="text-xs text-purple-500/70 mt-1">
                            🥇 Top Referrer
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
                <p className="text-slate-500">No referral data yet</p>
                <p className="text-sm text-slate-600 mt-1">
                  Start referring others to appear here!
                </p>
              </div>
            )}
          </div>

          {hasTopReferrers && (
            <div className="mt-4 pt-4 border-t border-slate-800/50">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Total Top 10 Referrals:</span>
                <span className="text-purple-300 font-semibold">
                  {parseInt(totalTop10Referrals.toString()).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend/Explanation */}
      <div className="mt-6 text-center">
        <div className="inline-flex items-center gap-4 text-sm text-slate-500 bg-slate-900/40 px-4 py-2 rounded-full">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/30"></div>
            <span>1st Place</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-slate-600/20 border border-slate-600/30"></div>
            <span>2nd Place</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-amber-700/20 border border-amber-700/30"></div>
            <span>3rd Place</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-cyan-500/20 border border-cyan-500/30"></div>
            <span>Your Position</span>
          </div>
        </div>
        <p className="text-xs text-slate-600 mt-3">
          Leaderboards update in real-time. Positions are based on lifetime
          totals.
        </p>
      </div>
    </div>
  );
};

export default Leaderboards;
