"use client";

import { useQuantuMatrix } from "../../hooks/useQuantuMatrix";
import { useState, useMemo } from "react";
import { useWaitForTransactionReceipt } from "wagmi";
import { useTranslations } from "next-intl";

interface RegistrationSectionProps {
  referralAddress: string | null;
  onRegistrationComplete: () => void;
}

export const RegistrationSection = ({
  referralAddress,
  onRegistrationComplete,
}: RegistrationSectionProps) => {
  const {
    userData,
    joinLibrary,
    approveUsdt,
    usdtBalance,
    usdtAllowance,
    joinCost,
    loading,
  } = useQuantuMatrix();

  const t = useTranslations("Dashboard.Registration");
  const [step, setStep] = useState<"info" | "approve" | "register">("info");
  const [error, setError] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToDisclaimer, setAgreedToDisclaimer] = useState(false);

  const numericJoinCost = useMemo(
    () => parseFloat(joinCost || "0"),
    [joinCost]
  );
  const numericBalance = useMemo(
    () => parseFloat(usdtBalance || "0"),
    [usdtBalance]
  );
  const numericAllowance = useMemo(
    () => parseFloat(usdtAllowance || "0"),
    [usdtAllowance]
  );

  const hasSufficientBalance =
    numericBalance >= numericJoinCost && numericJoinCost > 0;
  const hasSufficientAllowance =
    numericAllowance >= numericJoinCost && numericJoinCost > 0;
  const isProcessing = loading;
  const stepIndex = step === "info" ? 1 : 2;
  const canProceed =
    agreedToTerms && agreedToDisclaimer && hasSufficientBalance;

  const handleApprove = async () => {
    if (!canProceed) return;

    try {
      setError(null);
      await approveUsdt(joinCost);
      setStep("register");
    } catch (error) {
      console.error("Approval failed:", error);
      setError(t("error.approvalFailed"));
    }
  };

  const handleRegister = async () => {
    if (!canProceed) return;

    try {
      setError(null);
      const referrer =
        referralAddress || "0xd7e5a3c00b7871f57aeff293f1844db466260f4f";
      await joinLibrary(referrer);
      onRegistrationComplete();
      setStep("info");
    } catch (error) {
      console.error("Registration failed:", error);
      setError(t("error.registrationFailed"));
    }
  };

  const primaryButtonLabel = () => {
    if (!agreedToTerms || !agreedToDisclaimer) {
      return t("buttons.reviewRequired");
    }

    if (!hasSufficientBalance) {
      return t("buttons.insufficientBalance");
    }

    if (isProcessing) {
      return t("buttons.processing");
    }

    if (step === "info") {
      return t("buttons.approveUsdt", { amount: joinCost || "0" });
    }

    if (step === "register") {
      return t("buttons.completeRegistration");
    }

    return "Continue";
  };

  // Helper function to format address
  const formatAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <>
      <section className="space-y-5 md:space-y-6">
        {/* Top label + title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[0.7rem] uppercase tracking-[0.25em] text-yellow-300/80 mb-1">
              RicoMatrix • Onboarding
            </p>
            <h2 className="text-lg md:text-2xl font-semibold text-slate-50">
              {t("header.title")}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-[0.7rem] text-slate-400">
            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/40 px-3 py-1 text-emerald-300">
              {t("header.step", { stepIndex })}
            </span>
          </div>
        </div>

        {/* Main two-column layout */}
        <div className="grid gap-5 md:gap-6 lg:gap-8 xl:gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          {/* LEFT: Info / benefits */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-blue-500/25 bg-gradient-to-br from-slate-900/90 via-slate-950 to-slate-950/95 p-4 md:p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-blue-300 mb-1">
                    {t("benefits.title")}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {t("benefits.subtitle")}
                  </p>
                </div>
                <span className="hidden md:inline-flex items-center rounded-full border border-blue-400/40 bg-blue-500/10 px-3 py-1 text-[0.65rem] uppercase tracking-wide text-blue-200">
                  {t("benefits.matrixBadge")}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2 text-xs md:text-[0.8rem]">
                {t.raw("benefits.items").map((item: any, index: number) => (
                  <div key={index} className="flex gap-3">
                    <div className="mt-1 h-6 w-6 flex items-center justify-center rounded-lg bg-slate-900 border border-blue-500/40 text-[0.7rem] text-blue-300">
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

            {/* Terms & Conditions Checkboxes */}
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="terms-checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-yellow-500 focus:ring-yellow-500/30 focus:ring-offset-0"
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
                      onClick={() => setShowTermsModal(true)}
                      className="mt-2 text-xs text-yellow-400 hover:text-yellow-300 underline"
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
                    className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-yellow-500 focus:ring-yellow-500/30 focus:ring-offset-0"
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
                      onClick={() => setShowDisclaimerModal(true)}
                      className="mt-2 text-xs text-yellow-400 hover:text-yellow-300 underline"
                    >
                      {t("disclaimer.readDisclaimer")}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Referral info */}
            {referralAddress && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-emerald-300">
                    {t("referral.detected")}
                  </div>
                  <div className="text-[0.7rem] text-slate-100 truncate max-w-xs">
                    {t("referral.referrer", {
                      address: formatAddress(referralAddress),
                    })}
                  </div>
                </div>
                <span className="hidden md:inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-[0.65rem] text-emerald-200">
                  {t("referral.linked")}
                </span>
              </div>
            )}

            {/* Error / balance warnings */}
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                {error}
              </div>
            )}

            {!hasSufficientBalance && numericJoinCost > 0 && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                {t("error.insufficientBalance", {
                  joinCost: joinCost || "0",
                  usdtBalance: usdtBalance || "0",
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
                    {joinCost || "0"} USDT
                  </div>
                </div>
                <div className="rounded-xl bg-slate-900/80 border border-slate-700 px-3 py-3">
                  <div className="text-[0.7rem] text-slate-400 mb-1">
                    {t("cost.balance")}
                  </div>
                  <div className="text-base md:text-lg font-semibold text-slate-100">
                    {usdtBalance || "0"} USDT
                  </div>
                </div>
              </div>

              <div className="mb-4 flex items-center justify-between text-[0.7rem]">
                <span className="text-slate-400">{t("cost.allowance")}</span>
                <span
                  className={
                    hasSufficientAllowance
                      ? "text-emerald-300"
                      : "text-slate-500"
                  }
                >
                  {hasSufficientAllowance
                    ? t("cost.ready")
                    : t("cost.approvalRequired")}
                </span>
              </div>

              <div className="space-y-3">
                {step === "info" && (
                  <button
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
                    {primaryButtonLabel()}
                  </button>
                )}

                {step === "register" && (
                  <button
                    onClick={handleRegister}
                    disabled={
                      !canProceed || !hasSufficientAllowance || isProcessing
                    }
                    className={`w-full py-3 px-4 rounded-xl font-semibold text-sm md:text-base transition-all ${
                      canProceed && hasSufficientAllowance && !isProcessing
                        ? "bg-gradient-to-r from-emerald-500 to-green-500 text-black shadow-[0_0_24px_rgba(16,185,129,0.7)] hover:brightness-110 active:scale-[0.98]"
                        : "bg-slate-800 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    {isProcessing
                      ? t("buttons.processing")
                      : t("buttons.completeRegistration")}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-5">
              <div className="flex justify-between items-center text-[0.7rem] text-slate-500 mb-2">
                <span
                  className={
                    step === "info" ? "text-yellow-300" : "text-slate-400"
                  }
                >
                  {t("progress.step1")}
                </span>
                <span
                  className={
                    step !== "info" ? "text-yellow-300" : "text-slate-400"
                  }
                >
                  {t("progress.step2")}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-amber-400 to-emerald-400 transition-all duration-500"
                  style={{ width: step === "info" ? "50%" : "100%" }}
                />
              </div>
              <p className="mt-3 text-[0.7rem] text-slate-500 text-center">
                {t("progress.note")}
              </p>
            </div>
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
                {/* For each section, you would map through the translations */}
                <div>
                  <h4 className="text-lg font-semibold text-yellow-300 mb-3">
                    {t("modals.terms.sections.acceptance.title")}
                  </h4>
                  <p className="mb-2">
                    {t("modals.terms.sections.acceptance.content")}
                  </p>
                </div>

                {/* Repeat for other sections... */}

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
                  onClick={() => {
                    setAgreedToTerms(true);
                    setShowTermsModal(false);
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-black rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  {t("modals.terms.buttons.accept")}
                </button>
                <button
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

                {/* Map through disclaimer sections... */}

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
                  onClick={() => {
                    setAgreedToDisclaimer(true);
                    setShowDisclaimerModal(false);
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  {t("modals.disclaimer.buttons.accept")}
                </button>
                <button
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