import React from "react";
import { useQuantuMatrix } from "@/hooks/useQuantuMatrix";
import { useTranslations } from "next-intl";

const MigrationStatus: React.FC = () => {
  const { userData, migrationAndRoyaltyUI } = useQuantuMatrix();
  const t = useTranslations("MigrationStatus");

  if (!userData?.migrationData) {
    return (
      <div className="text-center py-4 text-white/50">
        {t("loading")}
      </div>
    );
  }

  const { status, v1RoyaltyPercent, legacyClaimable, v2Claimable, totalClaimable } = migrationAndRoyaltyUI || {};
  const hasLegacyClaimable = parseFloat(legacyClaimable || "0") > 0;
  const hasV2Claimable = parseFloat(v2Claimable || "0") > 0;

  const getStatusBadge = () => {
    switch (status) {
      case 0:
        return (
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-800 text-gray-300 text-sm">
            <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
            {t("status.notInV1")}
          </div>
        );
      case 1:
        return (
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-800/30 text-yellow-400 text-sm border border-yellow-700/50">
            <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
            {t("status.pending")}
          </div>
        );
      case 2:
        return (
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-800/30 text-amber-300 text-sm border border-yellow-700/35">
            <span className="w-2 h-2 bg-amber-300 rounded-full mr-2"></span>
            {t("status.completed")}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl p-5">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{t("title")}</h3>
          <p className="text-sm text-gray-400 mt-1">{t("subtitle")}</p>
        </div>
        {getStatusBadge()}
      </div>

      {/* Status Details */}
      <div className="space-y-4">
        {/* Migration Status */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-xs text-gray-400">{t("v1Status")}</div>
            <div className={`text-sm font-medium mt-1 ${
              status === 0 ? "text-gray-400" : "text-yellow-400"
            }`}>
              {status === 0 ? t("notFound") : t("found")}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-xs text-gray-400">{t("v2Status")}</div>
            <div className={`text-sm font-medium mt-1 ${
              status === 2 ? "text-amber-300" : "text-red-400"
            }`}>
              {status === 2 ? t("migrated") : t("notMigrated")}
            </div>
          </div>
        </div>

        {/* Royalty Information */}
        {(hasLegacyClaimable || hasV2Claimable) && (
          <div className="bg-gradient-to-r from-yellow-900/20 to-yellow-950/10 border border-yellow-800/30 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-white mb-3">
              {t("availableRoyalty")}
            </h4>
            <div className="space-y-2">
              {hasLegacyClaimable && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">{t("legacy")}</span>
                  <span className="text-sm font-medium text-yellow-300">
                    {parseFloat(legacyClaimable).toFixed(2)} USDT
                  </span>
                </div>
              )}
              {hasV2Claimable && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">{t("v2Fresh")}</span>
                  <span className="text-sm font-medium text-yellow-300">
                    {parseFloat(v2Claimable).toFixed(2)} USDT
                  </span>
                </div>
              )}
              {(hasLegacyClaimable || hasV2Claimable) && (
                <div className="pt-2 border-t border-yellow-800/30">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-white">
                      {t("totalClaimable")}
                    </span>
                    <span className="text-sm font-bold text-amber-300">
                      {parseFloat(totalClaimable || "0").toFixed(2)} USDT
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* V1 Royalty Share */}
        {status !== 0 && v1RoyaltyPercent > 0 && (
          <div className="bg-gradient-to-r from-yellow-900/20 to-yellow-800/10 border border-yellow-700/30 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">
                {t("v1RoyaltyShare")}
              </span>
              <span className="text-sm font-bold text-yellow-400">
                {v1RoyaltyPercent.toFixed(2)}%
              </span>
            </div>
          </div>
        )}

        {/* Actions based on status */}
        <div className="pt-4 border-t border-gray-800">
          {status === 1 && (
            <div className="text-center">
              <p className="text-sm text-yellow-300 mb-3">
                {t("migrationRequired")}
              </p>
              <p className="text-xs text-gray-400">
                {t("migrationInstructions")}
              </p>
            </div>
          )}
          {status === 2 && (
            <div className="text-center">
              <p className="text-sm text-amber-300 mb-2">
                {t("migrationComplete")}
              </p>
              <p className="text-xs text-gray-400">
                {t("accessAllFeatures")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MigrationStatus;