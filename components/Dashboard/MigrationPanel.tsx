import React, { useState } from "react";
import { useQuantuMatrix } from "@/hooks/useQuantuMatrix";

interface MigrationPanelProps {
  onMigrationComplete?: () => void;
}

const MigrationPanel: React.FC<MigrationPanelProps> = ({
  onMigrationComplete,
}) => {
  const { userData, migrateSelf, loading, refetchAllData } = useQuantuMatrix();
  const [isMigrating, setIsMigrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check if user should see migration panel
  if (
    !userData.exists ||
    !userData.migrationStatus ||
    !userData.migrationStatus.existsV1
  ) {
    return null;
  }

  const migrationStatus = userData.migrationStatus;
  const migrationData = userData.migrationData;

  // If already migrated, show status panel
  if (migrationStatus.migrated) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-lg p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                Migration Complete
              </h3>
              <p className="mt-2 text-gray-600">
                You have successfully migrated from V1 to V2. Welcome to the
                upgraded system!
              </p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {migrationData && migrationData.legacyClaimable !== "0" && (
                  <div className="bg-white p-4 rounded-lg border border-green-100">
                    <p className="text-sm text-gray-500">
                      Legacy Royalty Available
                    </p>
                    <p className="text-lg font-bold text-green-600">
                      {migrationData.legacyClaimable} USDT
                    </p>
                  </div>
                )}
                {migrationData && migrationData.v2RoyaltyAvail !== "0" && (
                  <div className="bg-white p-4 rounded-lg border border-green-100">
                    <p className="text-sm text-gray-500">
                      V2 Royalty Available
                    </p>
                    <p className="text-lg font-bold text-blue-600">
                      {migrationData.v2RoyaltyAvail} USDT
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleMigrate = async () => {
    setIsMigrating(true);
    setError(null);
    setSuccess(false);

    try {
      await migrateSelf();
      setSuccess(true);

      // Refresh data
      await refetchAllData();

      // Callback if provided
      if (onMigrationComplete) {
        onMigrationComplete();
      }
    } catch (err: any) {
      setError(err.message || "Migration failed. Please try again.");
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Upgrade to V2 Required
                </h2>
                <p className="text-amber-100 text-sm">
                  Migrate your account to access new features
                </p>
              </div>
            </div>
            <div className="bg-white/20 px-3 py-1 rounded-full">
              <span className="text-white text-sm font-medium">
                ACTION REQUIRED
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Migration Info */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              What's New in V2?
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
                <span className="ml-3 text-gray-700">
                  Universal wallet support (EOA & smart contracts)
                </span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
                <span className="ml-3 text-gray-700">
                  Claim-based RICO farming system
                </span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
                <span className="ml-3 text-gray-700">
                  Improved UI with detailed analytics
                </span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
                <span className="ml-3 text-gray-700">
                  Enhanced security features
                </span>
              </li>
            </ul>
          </div>

          {/* Migration Status */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Migration Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">
                    V1 Account
                  </span>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm font-medium text-gray-900">
                      Active
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Your V1 account is ready for migration
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">
                    V2 Account
                  </span>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-amber-500 rounded-full mr-2 animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-900">
                      Pending
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Migrate to activate V2 features
                </p>
              </div>
            </div>
          </div>

          {/* Migration Data Preview */}
          {migrationData && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Data to Migrate
              </h3>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="divide-y divide-gray-100">
                  <div className="px-4 py-3 flex justify-between items-center hover:bg-gray-50">
                    <span className="text-sm font-medium text-gray-600">
                      Legacy Royalty
                    </span>
                    <span className="text-lg font-bold text-amber-600">
                      {migrationData.legacySnap} USDT
                    </span>
                  </div>
                  <div className="px-4 py-3 flex justify-between items-center hover:bg-gray-50">
                    <span className="text-sm font-medium text-gray-600">
                      Legacy Claimable
                    </span>
                    <span className="text-lg font-bold text-green-600">
                      {migrationData.legacyClaimable} USDT
                    </span>
                  </div>
                  <div className="px-4 py-3 flex justify-between items-center hover:bg-gray-50">
                    <span className="text-sm font-medium text-gray-600">
                      V2 Royalty Available
                    </span>
                    <span className="text-lg font-bold text-blue-600">
                      {migrationData.v2RoyaltyAvail} USDT
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Migration Error
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-green-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Migration Successful!
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>
                        Your account has been successfully migrated to V2.
                        Refreshing data...
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Migration Button */}
          <div className="mt-8">
            <button
              onClick={handleMigrate}
              disabled={loading || isMigrating}
              className={`
                w-full py-4 px-6 rounded-lg text-lg font-semibold
                transition-all duration-300 transform hover:scale-[1.02]
                focus:outline-none focus:ring-4 focus:ring-amber-500/30
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                relative overflow-hidden group
                ${
                  loading || isMigrating
                    ? "bg-gradient-to-r from-amber-400 to-amber-500 text-white"
                    : "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-xl"
                }
              `}
            >
              {/* Loading animation */}
              {(loading || isMigrating) && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
              )}

              <div
                className={`flex items-center justify-center space-x-3 ${
                  loading || isMigrating ? "opacity-0" : "opacity-100"
                }`}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
                <span>Migrate to V2 Now</span>
              </div>

              {/* Ripple effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            </button>

            {/* Additional info */}
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">
                This is a one-time migration. Your V1 data will be preserved in
                V2.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                No funds will be lost. Transaction fee required.
              </p>
            </div>
          </div>

          {/* Migration Steps */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              Migration Process
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-2 font-semibold">
                  1
                </div>
                <p className="text-xs text-gray-600">
                  Initiate migration transaction
                </p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-2 font-semibold">
                  2
                </div>
                <p className="text-xs text-gray-600">Confirm in your wallet</p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-2 font-semibold">
                  3
                </div>
                <p className="text-xs text-gray-600">Access V2 features</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Need help? Contact support
            </div>
            <div className="text-xs text-gray-400">Migration ID: V1→V2</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Additional simplified version for minimal UI
export const MigrationBanner: React.FC = () => {
  const { userData, migrateSelf, loading } = useQuantuMatrix();
  const [isMigrating, setIsMigrating] = useState(false);

  if (
    !userData.exists ||
    !userData.migrationStatus ||
    !userData.migrationStatus.existsV1 ||
    userData.migrationStatus.migrated
  ) {
    return null;
  }

  const handleMigrate = async () => {
    setIsMigrating(true);
    try {
      await migrateSelf();
    } catch (err) {
      console.error("Migration failed:", err);
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500">
        <div className="max-w-7xl mx-auto py-3 px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between flex-wrap">
            <div className="w-0 flex-1 flex items-center">
              <span className="flex p-2 rounded-lg bg-amber-600">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </span>
              <p className="ml-3 font-medium text-white truncate">
                <span className="md:hidden">Migration Required!</span>
                <span className="hidden md:inline">
                  Your account needs to be migrated to V2 to continue using the
                  platform.
                </span>
              </p>
            </div>
            <div className="order-2 flex-shrink-0 sm:order-3 sm:ml-3">
              <button
                onClick={handleMigrate}
                disabled={loading || isMigrating}
                className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-amber-600 bg-white hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading || isMigrating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-amber-600/30 border-t-amber-600 rounded-full animate-spin mr-2"></div>
                    Migrating...
                  </>
                ) : (
                  "Migrate Now"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MigrationPanel;
