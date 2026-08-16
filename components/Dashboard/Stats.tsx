"use client";

import { formatUnits } from "viem";
import { useTranslations } from "next-intl";

const formatUnitsSafe = (value: unknown, decimals = 18): string => {
  try {
    if (value === null || value === undefined || value === "") return "0";
    return formatUnits(BigInt(String(value)), decimals);
  } catch {
    return "0";
  }
};

// Format currency with commas
const formatCurrency = (amount: string | number): string => {
  const numberValue = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numberValue)) return "0.00";

  return numberValue.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  });
};

// Format RICO tokens
const formatRICO = (amount: string | number): string => {
  const numberValue = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numberValue)) return "0";

  if (numberValue >= 1000) {
    return (numberValue / 1000).toFixed(1) + "K";
  }

  return numberValue.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping: true,
  });
};

interface StatsProps {
  userData: any;
  globalStats: any;
  globalRicoFarming?: any;
}

export const Stats = ({
  userData,
  globalStats,
  globalRicoFarming,
}: StatsProps) => {
  const t = useTranslations("Dashboard.stats.quickStats");
  const metrics = t.raw("metrics");

  const totalEarnings = userData?.exists
    ? Number(userData.track1TotalEarned || 0) +
      Number(userData.track2TotalEarned || 0)
    : 0;

  // Calculate RICO stats
  const ricoPending = userData?.ricoPending || "0";
  const ricoReceived = userData?.ricoSent || "0";
  const ricoTotal = userData?.ricoShouldHave || "0";

  // Global RICO stats
  const globalRicoShouldHave = globalRicoFarming?.[0]
    ? formatUnitsSafe(globalRicoFarming[0])
    : "0";
  const globalRicoSent = globalRicoFarming?.[1]
    ? formatUnitsSafe(globalRicoFarming[1])
    : "0";
  const globalRicoPending = globalRicoFarming?.[2]
    ? formatUnitsSafe(globalRicoFarming[2])
    : "0";

  const stats = [
    {
      name: metrics[0].name,
      value: `$${formatCurrency(totalEarnings)}`,
      description: metrics[0].description,
      icon: metrics[0].icon,
      gradient: "from-yellow-400 to-amber-500",
      priority: 1,
    },
    {
      name: metrics[1].name,
      value: `$${
        userData?.exists
          ? formatCurrency(userData.royaltyAvailable || 0)
          : "0.00"
      }`,
      description: metrics[1].description,
      icon: metrics[1].icon,
      gradient: "from-yellow-300 to-amber-400",
      priority: 1,
    },
    {
      name: metrics[2].name,
      value: userData?.exists
        ? `${
            (userData.track1Unlocked || 0) + (userData.track2Unlocked || 0)
          }/24`
        : "0/24",
      description: metrics[2].description,
      icon: metrics[2].icon,
      gradient: "from-yellow-300 to-amber-400",
      priority: 1,
    },
    {
      name: metrics[3].name,
      value: userData?.exists
        ? `${
            (userData.track1TotalCycles || 0) +
            (userData.track2TotalCycles || 0)
          }`
        : "0",
      description: metrics[3].description,
      icon: metrics[3].icon,
      gradient: "from-amber-300 to-amber-400",
      priority: 1,
    },
    // RICO Stats
    {
      name: metrics[4].name,
      value: userData?.exists ? `${formatRICO(ricoTotal)}` : "0",
      description: metrics[4].description,
      icon: metrics[4].icon,
      gradient: "from-yellow-300 to-amber-400",
      priority: userData?.exists && parseFloat(ricoTotal) > 0 ? 1 : 2,
    },
    {
      name: metrics[5].name,
      value: userData?.exists ? `${formatRICO(ricoPending)}` : "0",
      description: metrics[5].description,
      icon: metrics[5].icon,
      gradient: "from-orange-400 to-red-500",
      priority: userData?.exists && parseFloat(ricoPending) > 0 ? 1 : 2,
    },
    // Global stats
    {
      name: metrics[6].name,
      value: `${formatRICO(globalRicoSent)}`,
      description: metrics[6].description,
      icon: metrics[6].icon,
      gradient: "from-yellow-300 to-amber-400",
      priority: 3,
      isGlobal: true,
    },
    {
      name: metrics[7].name,
      value: `${formatRICO(globalRicoPending)}`,
      description: metrics[7].description,
      icon: metrics[7].icon,
      gradient: "from-rose-400 to-pink-500",
      priority: 3,
      isGlobal: true,
    },
  ];

  // Filter stats based on priority
  const filteredStats = stats
    .filter((stat) => {
      if (stat.priority === 1) return true;
      if (stat.priority === 2) {
        return (
          userData?.exists &&
          parseFloat(stat.name === metrics[5].name ? ricoPending : ricoTotal) >
            0
        );
      }
      if (stat.priority === 3) {
        return (
          parseFloat(
            stat.name === metrics[6].name ? globalRicoSent : globalRicoPending
          ) > 0
        );
      }
      return true;
    })
    .slice(0, 6); // Limit to 6 stats max

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-50">{t("title")}</h2>
        {userData?.exists &&
          (parseFloat(ricoTotal) > 0 || parseFloat(ricoPending) > 0) && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-900/20 border border-yellow-700/40">
              <span className="text-sm text-yellow-400">{t("ricoActive")}</span>
            </div>
          )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredStats.map((stat, index) => (
          <div
            key={index}
            className={`
              relative rounded-xl p-4 hover:scale-[1.02] transition-all duration-300
              ${
                stat.isGlobal
                  ? "border border-yellow-500/30 bg-yellow-950/10"
                  : "border border-slate-700/50 bg-slate-800/30"
              }
              hover:border-slate-600/50 hover:shadow-lg hover:shadow-slate-900/30
              ${
                parseFloat(stat.value.replace(/[^0-9.]/g, "")) > 0
                  ? "opacity-100"
                  : "opacity-70"
              }
            `}
          >
            {stat.isGlobal && (
              <div className="absolute -top-2 -right-2">
                <span className="text-xs px-2 py-1 rounded-full bg-yellow-900/30 text-yellow-100">
                  {t("global")}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between mb-3">
              <div
                className={`
                w-10 h-10 rounded-lg flex items-center justify-center text-lg
                bg-gradient-to-r ${stat.gradient} shadow-md
              `}
              >
                {stat.icon}
              </div>
              {stat.name.includes("RICO") &&
                parseFloat(stat.value.replace(/[^0-9.]/g, "")) > 0 && (
                  <div
                    className={`text-xs px-2 py-1 rounded-full ${
                      stat.name.includes("Pending")
                        ? "bg-orange-900/40 text-orange-300 border border-orange-700/40"
                        : "bg-yellow-900/20 text-yellow-300 border border-yellow-700/40"
                    }`}
                  >
                    {stat.name.includes("Pending") ? t("pending") : t("farmed")}
                  </div>
                )}
            </div>

            <dt className="text-sm font-medium text-slate-400 truncate mb-1">
              {stat.name}
            </dt>
            <dd
              className={`
              text-xl font-bold mb-1
              ${stat.name.includes("RICO") ? "text-yellow-300" : "text-slate-50"}
              ${stat.isGlobal ? "text-yellow-300" : ""}
            `}
            >
              {stat.value}
              {stat.name.includes("RICO") && !stat.name.includes("Global") && (
                <span className="text-xs ml-1 text-yellow-400">RICO</span>
              )}
              {stat.name.includes("Global RICO") && (
                <span className="text-xs ml-1 text-yellow-400">RICO</span>
              )}
            </dd>
            <p className="text-xs text-slate-500 leading-tight">
              {stat.description}
            </p>

            {/* Progress bar for RICO stats */}
            {stat.name === metrics[4].name &&
              userData?.exists &&
              parseFloat(ricoTotal) > 0 &&
              parseFloat(ricoReceived) > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{t("progress")}</span>
                    <span>
                      {Math.round(
                        (parseFloat(ricoReceived) / parseFloat(ricoTotal)) * 100
                      )}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-yellow-400 to-amber-500 h-1.5 rounded-full"
                      style={{
                        width: `${Math.min(
                          (parseFloat(ricoReceived) / parseFloat(ricoTotal)) *
                            100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

            {/* Progress bar for Global RICO */}
            {stat.name === metrics[6].name &&
              parseFloat(globalRicoShouldHave) > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{t("distributed")}</span>
                    <span>
                      {Math.round(
                        (parseFloat(globalRicoSent) /
                          parseFloat(globalRicoShouldHave)) *
                          100
                      )}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-yellow-400 to-amber-500 h-1.5 rounded-full"
                      style={{
                        width: `${Math.min(
                          (parseFloat(globalRicoSent) /
                            parseFloat(globalRicoShouldHave)) *
                            100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
          </div>
        ))}
      </div>


    </div>
  );
};
