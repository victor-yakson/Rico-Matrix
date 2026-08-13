"use client";

import { useQuantuMatrix } from "../../hooks/useQuantuMatrix";
import { useState, useMemo, useEffect } from "react";
import { useReadContract, useAccount } from "wagmi";
import { useTranslations } from "next-intl";

interface RegistrationSectionProps {
  referralAddress: string | null;
  onRegistrationComplete: () => void;
  userData?: {
    exists: boolean;
    // Add other user data properties if needed
  };
}

const FALLBACK_REFERRER = "0xd7e5a3c00b7871f57aeff293f1844db466260f4f";
const REFERRAL_STORAGE_KEY = "quantumatrix_referral_address";

type PaymentTokenOption = {
  symbol: string;
  address: `0x${string}`;
  decimals: number;
};

const TOKEN_STYLES: Record<
  string,
  { label: string; className: string; ringClassName: string }
> = {
  USDT: {
    label: "T",
    className: "from-emerald-300 via-teal-400 to-emerald-600 text-white",
    ringClassName: "ring-emerald-300/40",
  },
  USDC: {
    label: "$",
    className: "from-sky-300 via-blue-500 to-blue-700 text-white",
    ringClassName: "ring-blue-300/40",
  },
  DAI: {
    label: "D",
    className: "from-amber-200 via-yellow-500 to-orange-600 text-slate-950",
    ringClassName: "ring-yellow-300/40",
  },
  USDG: {
    label: "G",
    className: "from-lime-200 via-emerald-400 to-cyan-600 text-slate-950",
    ringClassName: "ring-emerald-300/40",
  },
};

const TokenLogo = ({ symbol }: { symbol: string }) => {
  const style = TOKEN_STYLES[symbol] || {
    label: symbol.slice(0, 1),
    className: "from-slate-300 via-slate-500 to-slate-700 text-white",
    ringClassName: "ring-slate-300/30",
  };

  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-black shadow-lg ring-2 ${style.className} ${style.ringClassName}`}
      aria-hidden="true"
    >
      {style.label}
    </span>
  );
};

export const RegistrationSection = ({
  referralAddress,
  onRegistrationComplete,
  userData,
}: RegistrationSectionProps) => {
  const {
    joinLibrary,
    approveUsdt,
    paymentTokenBalance,
    paymentTokenAllowance,
    joinCost,
    loading,
    contractConfig,
    paymentTokenSymbol,
    paymentTokenMaxAllowance,
    paymentTokens,
    selectedPaymentTokenAddress,
    setSelectedPaymentTokenAddress,
  } = useQuantuMatrix();

  const { address: userAddress } = useAccount();
  const t = useTranslations("Dashboard.Registration");

  // State for managing referral
  const [persistedReferralAddress, setPersistedReferralAddress] = useState<
    string | null
  >(null);
  const [referralInput, setReferralInput] = useState<string>("");

  // Existing state variables
  const [step, setStep] = useState<"info" | "approve" | "register">("info");
  const [error, setError] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToDisclaimer, setAgreedToDisclaimer] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [tokenMenuOpen, setTokenMenuOpen] = useState(false);

  // Check if user is already registered and clear referral if they are
  useEffect(() => {
    if (userData?.exists) {
      // User is already registered, clear any stored referral
      localStorage.removeItem(REFERRAL_STORAGE_KEY);
      setPersistedReferralAddress(null);
      setReferralInput("");
    }
  }, [userData?.exists]);

  // Load referral from storage on component mount (only if user is not registered)
  useEffect(() => {
    if (typeof window !== "undefined" && !userData?.exists) {
      const stored = localStorage.getItem(REFERRAL_STORAGE_KEY);
      if (stored) {
        setPersistedReferralAddress(stored);
        setReferralInput(stored);
      }
    }
  }, [userData?.exists]);

  // Update persisted referral when prop changes (only if user is not registered)
  useEffect(() => {
    if (referralAddress && !userData?.exists) {
      localStorage.setItem(REFERRAL_STORAGE_KEY, referralAddress);
      setPersistedReferralAddress(referralAddress);
      setReferralInput(referralAddress);
    }
  }, [referralAddress, userData?.exists]);

  // Use persisted referral for validation (only if user is not registered)
  const effectiveReferralAddress = userData?.exists
    ? null
    : persistedReferralAddress || referralAddress;

  // -----------------------------
  // Referral validation (skip if user is already registered)
  // -----------------------------

  const isReferralValid = Boolean(
    effectiveReferralAddress &&
      /^0x[a-fA-F0-9]{40}$/.test(effectiveReferralAddress)
  );

  const isSelfReferral = Boolean(
    effectiveReferralAddress &&
      userAddress &&
      effectiveReferralAddress.toLowerCase() === userAddress.toLowerCase()
  );

  // Wagmi read: only enabled when referral is valid and user is not registered
  const { data: referralExists, isLoading: checkingReferral } = useReadContract(
    {
      address: contractConfig.address,
      abi: contractConfig.abi,
      functionName: "readers",
      args:
        effectiveReferralAddress && !userData?.exists
          ? [effectiveReferralAddress]
          : undefined,
      query: { enabled: isReferralValid && !userData?.exists },
    }
  );
  const referralReaderId =
    BigInt(((referralExists as any)?.id ?? (referralExists as any)?.[0] ?? 0).toString());
  const referrerIsRegistered = referralReaderId > BigInt(0);

  // IMPORTANT: Force this into a boolean using Boolean(...)
  const showReferralWarning = Boolean(
      effectiveReferralAddress &&
      isReferralValid &&
      !referrerIsRegistered &&
      !checkingReferral &&
      !userData?.exists &&
      effectiveReferralAddress !== FALLBACK_REFERRER
  );

  // -----------------------------
  // Numeric comparisons
  // -----------------------------

  const numericJoinCost = useMemo(
    () => parseFloat(joinCost || "0"),
    [joinCost]
  );

  const numericBalance = useMemo(
    () => parseFloat(paymentTokenBalance || "0"),
    [paymentTokenBalance]
  );

  const numericAllowance = useMemo(
    () => parseFloat(paymentTokenAllowance || "0"),
    [paymentTokenAllowance]
  );
  const activePaymentToken = useMemo(
    () =>
      paymentTokens?.find(
        (token: PaymentTokenOption) =>
          token.address.toLowerCase() ===
          selectedPaymentTokenAddress?.toLowerCase(),
      ) || paymentTokens?.[0],
    [paymentTokens, selectedPaymentTokenAddress],
  );
  const selectedTokenSymbol = activePaymentToken?.symbol || paymentTokenSymbol || "USDT";

  useEffect(() => {
    if (!userData?.exists) {
      setStep("info");
      setError(null);
    }
  }, [selectedPaymentTokenAddress, userData?.exists]);

  const hasSufficientBalance =
    numericBalance >= numericJoinCost && numericJoinCost > 0;

  const hasSufficientAllowance = useMemo(() => {
    return numericAllowance >= numericJoinCost && numericJoinCost > 0;
  }, [numericAllowance, numericJoinCost]);

  const isProcessing = Boolean(
    loading || isApproving || isRegistering || checkingReferral
  );

  const stepIndex = step === "info" ? 1 : 2;

  // If user is already registered, they can't proceed
  const canProceed = userData?.exists
    ? false
    : Boolean(
        agreedToTerms &&
          agreedToDisclaimer &&
          hasSufficientBalance &&
          effectiveReferralAddress &&
          isReferralValid &&
          !isSelfReferral
      );

  // -----------------------------
  // Sync step with allowance state
  // -----------------------------
  useEffect(() => {
    if (hasSufficientAllowance && step === "info" && !userData?.exists) {
      setStep("register");
    }
  }, [hasSufficientAllowance, step, userData?.exists]);

  // -----------------------------
  // Validate referral address when it changes
  // -----------------------------
  useEffect(() => {
    if (!effectiveReferralAddress || userData?.exists) {
      return;
    }

    const valid = /^0x[a-fA-F0-9]{40}$/.test(effectiveReferralAddress);
    if (!valid) {
      setError(t("error.invalidAddress"));
      return;
    }

    if (
      userAddress &&
      effectiveReferralAddress.toLowerCase() === userAddress.toLowerCase()
    ) {
      setError(t("error.selfReferral"));
      return;
    }

    setError(null);
  }, [effectiveReferralAddress, userAddress, t, userData?.exists]);

  // -----------------------------
  // Actions
  // -----------------------------
  const handleReferralInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (userData?.exists) return; // Don't allow changes if already registered

    const value = e.target.value.trim();
    setReferralInput(value);

    if (/^0x[a-fA-F0-9]{40}$/.test(value)) {
      localStorage.setItem(REFERRAL_STORAGE_KEY, value);
      setPersistedReferralAddress(value);
      setError(null);
    }
  };

  const handleApprove = async () => {
    if (!canProceed || isProcessing || userData?.exists) return;

    try {
      setError(null);
      setIsApproving(true);

      await approveUsdt(joinCost || "0");

      setStep("register");
    } catch (err: any) {
      console.error("Approval failed:", err);
      setError(err?.message || t("error.approvalFailed"));
    } finally {
      setIsApproving(false);
    }
  };

  const handleRegister = async () => {
    // If user is already registered, don't proceed
    if (userData?.exists) {
      setError(t("error.alreadyRegistered"));
      return;
    }

    // Check if referral is provided
    if (!effectiveReferralAddress) {
      setError(t("error.referralRequired"));
      return;
    }

    if (
      !canProceed ||
      !hasSufficientAllowance ||
      isProcessing ||
      isSelfReferral ||
      showReferralWarning
    ) {
      if (!effectiveReferralAddress) {
        setError(t("error.referralRequired"));
      }
      return;
    }

    try {
      setError(null);
      setIsRegistering(true);

      let referrer = effectiveReferralAddress;

      const valid = /^0x[a-fA-F0-9]{40}$/.test(referrer);
      if (!valid) {
        throw new Error(t("error.invalidAddress"));
      }

      if (userAddress && referrer.toLowerCase() === userAddress.toLowerCase()) {
        throw new Error(t("error.selfReferral"));
      }

      // referralExists from contract check (unless fallback)
      if (referralExists === false && referrer !== FALLBACK_REFERRER) {
        throw new Error(t("error.invalidReferral"));
      }

      await joinLibrary(referrer);

      // Clear storage after successful registration
      localStorage.removeItem(REFERRAL_STORAGE_KEY);

      onRegistrationComplete();
      setStep("info");
    } catch (err: any) {
      console.error("Registration failed:", err);

      const msg = String(err?.message || "");
      if (msg.toLowerCase().includes("invalid") && msg.includes("address")) {
        setError(t("error.invalidAddress"));
      } else if (msg.toLowerCase().includes("refer yourself")) {
        setError(t("error.selfReferral"));
      } else if (msg.toLowerCase().includes("referral")) {
        setError(t("error.invalidReferral"));
      } else if (
        msg.toLowerCase().includes("already registered") ||
        msg.toLowerCase().includes("already exists")
      ) {
        setError(t("error.alreadyRegistered"));
      } else {
        setError(err?.message || t("error.registrationFailed"));
      }
    } finally {
      setIsRegistering(false);
    }
  };

  // -----------------------------
  // Helpers
  // -----------------------------
  const formatAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const getReferralStatusText = () => {
    if (userData?.exists) {
      return t("referral.alreadyRegisteredStatus");
    }
    if (!effectiveReferralAddress) {
      return t("referral.required");
    }
    if (checkingReferral) {
      return t("referral.checking");
    }
    if (isSelfReferral) {
      return t("referral.selfReferral");
    }
    if (isReferralValid && referralExists !== false) {
      return t("referral.detected");
    }
    return t("referral.invalid");
  };

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <>
      <section className="space-y-5 md:space-y-6">
        {/* Top label + title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[0.7rem] uppercase tracking-[0.25em] text-yellow-300/80 mb-1">
              {t("header.subtitle")}
            </p>
            <h2 className="text-lg md:text-2xl font-semibold text-slate-50">
              {t("sectionTitle")}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-[0.7rem] text-slate-400">
            <span className="rounded-full bg-yellow-500/10 border border-yellow-400/35 px-3 py-1 text-amber-300">
              {t("header.stepIndicator", { stepIndex })}
            </span>
            <span className="text-xs text-slate-500">
              {t("header.allowanceLabel", {
                allowance: Number(paymentTokenAllowance).toFixed(2),
                token: selectedTokenSymbol,
              })}
            </span>
            {userData?.exists && (
              <span className="rounded-full bg-yellow-500/10 border border-yellow-400/35 px-3 py-1 text-amber-300">
                {t("header.registeredBadge")}
              </span>
            )}
          </div>
        </div>

        {/* Main two-column layout */}
        <div className="grid gap-5 md:gap-6 lg:gap-8 xl:gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          {/* LEFT: Info / benefits */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-yellow-500/25 bg-gradient-to-br from-slate-900/90 via-slate-950 to-slate-950/95 p-4 md:p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-yellow-300 mb-1">
                    {t("benefits.title")}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {t("benefits.subtitle")}
                  </p>
                </div>
                <span className="hidden md:inline-flex items-center rounded-full border border-yellow-400/40 bg-yellow-500/10 px-3 py-1 text-[0.65rem] uppercase tracking-wide text-yellow-200">
                  {t("benefits.matrixBadge")}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2 text-xs md:text-[0.8rem]">
                {t.raw("benefits.items").map((item: any, index: number) => (
                  <div className="flex gap-3" key={index}>
                    <div className="mt-1 h-6 w-6 flex items-center justify-center rounded-lg bg-slate-900 border border-yellow-500/35 text-[0.7rem] text-yellow-300">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-slate-100">{item.title}</p>
                      <p className="text-slate-400 mt-1">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Referral Address Section */}
            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 mb-1">
                    {t("referral.title")}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {userData?.exists
                      ? t("referral.noReferralNeeded")
                      : t("referral.subtitle")}
                  </p>
                </div>
                {/* Removed clear button */}
              </div>

              <div className="space-y-3">
                {userData?.exists ? (
                  <div className="rounded-xl border border-yellow-400/30 bg-yellow-500/10 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-yellow-500/14 border border-yellow-400/35 flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-amber-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-amber-300">
                          {t("referral.alreadyRegistered")}
                        </div>
                        <div className="text-[0.7rem] text-slate-100">
                          {t("referral.noReferralNeeded")}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : effectiveReferralAddress ? (
                  <div
                    className={`rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${
                      isReferralValid &&
                      referralExists !== false &&
                      !isSelfReferral
                        ? "border border-yellow-400/35 bg-yellow-500/10"
                        : "border border-red-500/30 bg-red-500/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {checkingReferral ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      ) : isSelfReferral ? (
                        <div className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-red-300"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                        </div>
                      ) : isReferralValid && referralExists !== false ? (
                        <div className="w-6 h-6 rounded-full bg-yellow-500/14 border border-yellow-400/35 flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-amber-300"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-red-300"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </div>
                      )}

                      <div>
                        <div
                          className={`text-xs font-semibold ${
                            checkingReferral
                              ? "text-slate-300"
                              : isSelfReferral
                              ? "text-red-300"
                              : isReferralValid && referralExists !== false
                              ? "text-amber-300"
                              : "text-red-300"
                          }`}
                        >
                          {getReferralStatusText()}
                        </div>
                        <div className="text-[0.7rem] text-slate-100 truncate max-w-xs">
                          {formatAddress(effectiveReferralAddress)}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`hidden md:inline-flex items-center rounded-full border px-3 py-1 text-[0.65rem] ${
                        checkingReferral
                          ? "border-slate-400/40 bg-slate-500/15 text-slate-300"
                          : isSelfReferral
                          ? "border-red-400/40 bg-red-500/15 text-red-200"
                          : isReferralValid && referralExists !== false
                          ? "border-yellow-400/35 bg-yellow-500/10 text-amber-200"
                          : "border-red-400/40 bg-red-500/15 text-red-200"
                      }`}
                    >
                      {checkingReferral
                        ? t("referral.checkingBadge")
                        : isSelfReferral
                        ? t("referral.selfReferralBadge")
                        : isReferralValid && referralExists !== false
                        ? t("referral.validBadge")
                        : t("referral.invalidBadge")}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={referralInput}
                      onChange={handleReferralInputChange}
                      placeholder="0x..."
                      disabled={userData?.exists}
                      className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <p className="text-xs text-slate-400">
                      {t("referral.inputHelp")}
                    </p>
                  </div>
                )}

                {!effectiveReferralAddress && !userData?.exists && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                    <div className="flex items-start gap-2">
                      <svg
                        className="w-4 h-4 text-amber-300 mt-0.5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                      </svg>
                      <div className="text-xs text-amber-200">
                        {t("referral.requiredWarning")}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Warning for non-existent referral */}
            {showReferralWarning &&
              effectiveReferralAddress &&
              !userData?.exists && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-4 h-4 text-amber-300 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                    <div className="text-xs text-amber-200">
                      {t("referral.warning", {
                        address: formatAddress(effectiveReferralAddress),
                      })}
                      <div className="mt-1 text-amber-300/80">
                        {t("referral.warningNote")}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            {/* Terms & Conditions Checkboxes */}
            {!userData?.exists && (
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="terms-checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      disabled={userData?.exists}
                      className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-yellow-500 focus:ring-yellow-500/30 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="terms-checkbox"
                        className="text-sm font-medium text-slate-100 cursor-pointer"
                      >
                        {t("terms.title")}
                      </label>
                      <p className="text-xs text-slate-400 mt-1">
                        {t("terms.description")}
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        disabled={userData?.exists}
                        className="mt-2 text-xs text-yellow-400 hover:text-yellow-300 underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t("terms.readTerms")}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="disclaimer-checkbox"
                      checked={agreedToDisclaimer}
                      onChange={(e) => setAgreedToDisclaimer(e.target.checked)}
                      disabled={userData?.exists}
                      className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-yellow-500 focus:ring-yellow-500/30 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="disclaimer-checkbox"
                        className="text-sm font-medium text-slate-100 cursor-pointer"
                      >
                        {t("disclaimer.title")}
                      </label>
                      <p className="text-xs text-slate-400 mt-1">
                        {t("disclaimer.description")}
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowDisclaimerModal(true)}
                        disabled={userData?.exists}
                        className="mt-2 text-xs text-yellow-400 hover:text-yellow-300 underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t("disclaimer.readDisclaimer")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error / balance warnings */}
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                {error}
              </div>
            )}

            {!hasSufficientBalance &&
              numericJoinCost > 0 &&
              !userData?.exists && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                  {t("alerts.insufficientBalance", {
                    joinCost: joinCost || "0",
                    tokenBalance: paymentTokenBalance || "0",
                    token: selectedTokenSymbol,
                  })}
                </div>
              )}
          </div>

          {/* RIGHT: Cost / actions */}
          <div className="rounded-2xl border border-yellow-500/25 bg-slate-950/95 p-4 md:p-5 shadow-[0_0_26px_rgba(0,0,0,0.9)] flex flex-col justify-between">
            <div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl bg-slate-900/80 border border-slate-700 px-3 py-3">
                  <div className="text-[0.7rem] text-slate-400 mb-1">
                    {t("cost.registrationCost")}
                  </div>
                  <div className="text-base md:text-lg font-semibold text-yellow-300">
                    {joinCost || "0"} {selectedTokenSymbol}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-900/80 border border-slate-700 px-3 py-3">
                  <div className="text-[0.7rem] text-slate-400 mb-1">
                    {t("cost.balance", { token: selectedTokenSymbol })}
                  </div>
                  <div className="text-base md:text-lg font-semibold text-slate-100">
                    {Number(paymentTokenBalance).toFixed(2) || "0"} {selectedTokenSymbol}
                  </div>
                </div>
              </div>

              <div className="mb-4 flex items-center justify-between text-[0.7rem]">
                <span className="text-slate-400">{t("cost.allowance", { token: selectedTokenSymbol })}</span>
                <span
                  className={
                    hasSufficientAllowance
                      ? "text-amber-300"
                      : "text-slate-500"
                  }
                >
                  {hasSufficientAllowance
                    ? t("cost.ready")
                    : t("cost.approvalRequired")}
                </span>
              </div>

              {paymentTokens?.length > 1 && (
                <div className="relative mb-4">
                  <span className="mb-2 block text-[0.7rem] text-slate-400">
                    Payment token
                  </span>
                  <button
                    type="button"
                    onClick={() => setTokenMenuOpen((open) => !open)}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-700/80 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 px-3 py-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_26px_rgba(0,0,0,0.32)] transition hover:border-yellow-400/50 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                    aria-expanded={tokenMenuOpen}
                    aria-haspopup="listbox"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <TokenLogo symbol={selectedTokenSymbol} />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-50">
                          {selectedTokenSymbol}
                        </span>
                        <span className="block truncate text-[0.65rem] text-slate-400">
                          {activePaymentToken?.address}
                        </span>
                      </span>
                    </span>
                    <svg
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${tokenMenuOpen ? "rotate-180" : ""}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  {tokenMenuOpen && (
                    <div
                      className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-yellow-400/25 bg-slate-950/98 shadow-[0_20px_45px_rgba(0,0,0,0.55)] backdrop-blur"
                      role="listbox"
                    >
                      {paymentTokens.map((token: PaymentTokenOption) => {
                        const isSelected =
                          token.address.toLowerCase() ===
                          selectedPaymentTokenAddress?.toLowerCase();

                        return (
                          <button
                            key={token.address}
                            type="button"
                            onClick={() => {
                              setSelectedPaymentTokenAddress(token.address);
                              setStep("info");
                              setError(null);
                              setTokenMenuOpen(false);
                            }}
                            className={`flex w-full items-center gap-3 px-3 py-3 text-left transition ${
                              isSelected
                                ? "bg-yellow-400/10 text-yellow-100"
                                : "text-slate-200 hover:bg-slate-800"
                            }`}
                            role="option"
                            aria-selected={isSelected}
                          >
                            <TokenLogo symbol={token.symbol} />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold">
                                {token.symbol}
                              </span>
                              <span className="block truncate text-[0.65rem] text-slate-500">
                                {token.address}
                              </span>
                            </span>
                            {isSelected && (
                              <span className="rounded-full bg-yellow-300 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-slate-950">
                                Active
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {userData?.exists ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-yellow-500/14 border border-yellow-400/35 flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-amber-300"
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
                  <h3 className="text-lg font-semibold text-amber-300 mb-2">
                    {t("referral.alreadyRegistered")}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {t("referral.noReferralNeeded")}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Approve button */}
                  {!hasSufficientAllowance && (
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={
                        !canProceed || isProcessing || numericJoinCost === 0
                      }
                      className={`w-full py-3 px-4 rounded-xl font-semibold text-sm md:text-base transition-all ${
                        canProceed && !isProcessing && numericJoinCost > 0
                          ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow-[0_0_24px_rgba(250,204,21,0.7)] hover:brightness-110 active:scale-[0.98]"
                          : "bg-slate-800 text-slate-500 cursor-not-allowed"
                      }`}
                    >
                      {isApproving
                        ? t("buttons.approving")
                        : t("buttons.approveUsdt", {
                            amount: paymentTokenMaxAllowance || "21000",
                            token: selectedTokenSymbol,
                          })}
                    </button>
                  )}

                  {/* Register button */}
                  {hasSufficientAllowance && (
                    <button
                      type="button"
                      onClick={handleRegister}
                      disabled={
                        !canProceed ||
                        !hasSufficientAllowance ||
                        isProcessing ||
                        isSelfReferral ||
                        showReferralWarning ||
                        !effectiveReferralAddress
                      }
                      className={`w-full py-3 px-4 rounded-xl font-semibold text-sm md:text-base transition-all ${
                        canProceed &&
                        !isProcessing &&
                        !isSelfReferral &&
                        !showReferralWarning &&
                        effectiveReferralAddress
                          ? "bg-gradient-to-r from-amber-400 to-amber-400 text-black shadow-[0_0_24px_rgba(184,128,54,0.62)] hover:brightness-110 active:scale-[0.98]"
                          : "bg-slate-800 text-slate-500 cursor-not-allowed"
                      }`}
                    >
                      {isRegistering
                        ? t("buttons.registering")
                        : t("buttons.completeRegistration")}
                    </button>
                  )}
                </div>
              )}
            </div>

            {!userData?.exists && (
              <div className="mt-5">
                <div className="flex justify-between items-center text-[0.7rem] text-slate-500 mb-2">
                  <span
                    className={
                      !hasSufficientAllowance
                        ? "text-yellow-300"
                        : "text-slate-400"
                    }
                  >
                    {t("progress.step1", { token: selectedTokenSymbol })}
                  </span>
                  <span
                    className={
                      hasSufficientAllowance
                        ? "text-amber-300"
                        : "text-slate-400"
                    }
                  >
                    {t("progress.step2")}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-300 transition-all duration-500"
                    style={{ width: hasSufficientAllowance ? "100%" : "50%" }}
                  />
                </div>
                <p className="mt-3 text-[0.7rem] text-slate-500 text-center">
                  {t("progress.note")}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Terms & Conditions Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/80 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-black"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">
                    {t("modals.terms.title")}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {t("modals.terms.lastUpdated", {
                      date: new Date().toLocaleDateString(),
                    })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Terms Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6 text-sm text-slate-300">
                <div>
                  <h4 className="text-lg font-semibold text-yellow-300 mb-3">
                    {t("modals.terms.sections.acceptance.title")}
                  </h4>
                  <p className="mb-2">
                    {t("modals.terms.sections.acceptance.content")}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-800/50 p-4 border border-yellow-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <svg
                      className="w-5 h-5 text-yellow-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                    <h5 className="font-semibold text-yellow-300">
                      {t("modals.terms.importantNotice.title")}
                    </h5>
                  </div>
                  <p className="text-sm">
                    {t("modals.terms.importantNotice.content")}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-700 bg-slate-800/50">
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    setAgreedToTerms(true);
                    setShowTermsModal(false);
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-black rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  {t("modals.terms.buttons.accept")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTermsModal(false)}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-medium transition-colors"
                >
                  {t("modals.terms.buttons.close")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer Modal */}
      {showDisclaimerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/80 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
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
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">
                    {t("modals.disclaimer.title")}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {t("modals.disclaimer.subtitle")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDisclaimerModal(false)}
                className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Disclaimer Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6 text-sm text-slate-300">
                <div className="rounded-lg bg-red-500/10 p-4 border border-red-500/30 mb-4">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                    <h4 className="text-lg font-semibold text-red-300">
                      {t("modals.disclaimer.warning.title")}
                    </h4>
                  </div>
                  <p className="mt-2">
                    {t("modals.disclaimer.warning.content")}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-800/50 p-4 border border-red-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <svg
                      className="w-5 h-5 text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <h5 className="font-semibold text-red-300">
                      {t("modals.disclaimer.acknowledgment.title")}
                    </h5>
                  </div>
                  <p className="text-sm">
                    {t("modals.disclaimer.acknowledgment.content")}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-700 bg-slate-800/50">
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    setAgreedToDisclaimer(true);
                    setShowDisclaimerModal(false);
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  {t("modals.disclaimer.buttons.accept")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDisclaimerModal(false)}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-medium transition-colors"
                >
                  {t("modals.disclaimer.buttons.close")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
