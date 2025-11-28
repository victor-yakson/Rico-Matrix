'use client';

import { useAccount } from 'wagmi';
import { useState, useMemo } from 'react';

export const ReferralSection = () => {
  const { address } = useAccount();
  const [copied, setCopied] = useState(false);

  const referralLink = useMemo(() => {
    if (!address) return 'Connect your wallet to get referral link';
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}?ref=${address}`;
  }, [address]);

  const copyReferralLink = async () => {
    if (address && referralLink && referralLink.startsWith('http')) {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareOnTwitter = () => {
    if (!address || !referralLink || !referralLink.startsWith('http')) return;
    const text = `Join me on QuantuMatrix - Read real book chapters and earn rewards on blockchain! 🚀📚\n\nUse my referral link: ${referralLink}\n\n#QuantuMatrix #Blockchain #EarnWhileYouRead`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      text
    )}`;
    window.open(url, '_blank');
  };

  const shareOnTelegram = () => {
    if (!address || !referralLink || !referralLink.startsWith('http')) return;
    const text = `Join me on QuantuMatrix - Read real book chapters and earn rewards on blockchain! 🚀📚\n\nUse my referral link: ${referralLink}`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(
      referralLink
    )}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const isActive = Boolean(address);

  return (
    <div className="rounded-2xl border border-purple-400/40 bg-slate-950/80 p-6 shadow-[0_0_26px_rgba(88,28,135,0.6)] backdrop-blur-sm">
      <h2 className="text-2xl font-bold text-slate-50 mb-4">
        Referral Program
      </h2>

      {/* Referral Benefits */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-yellow-300 mb-3">
          Earn 50% Referral Bonus
        </h3>
        <ul className="space-y-2 text-sm text-slate-300">
          <li className="flex items-center">
            <span className="mr-2 text-emerald-400">✓</span>
            Get 50% of your referral&apos;s first chapter purchase.
          </li>
          <li className="flex items-center">
            <span className="mr-2 text-emerald-400">✓</span>
            Earn from their entire downline through unilevel bonuses.
          </li>
          <li className="flex items-center">
            <span className="mr-2 text-emerald-400">✓</span>
            Build your matrix network faster with smart spillovers.
          </li>
          <li className="flex items-center">
            <span className="mr-2 text-emerald-400">✓</span>
            Increase your global royalty pool share over time.
          </li>
        </ul>
      </div>

      {/* Referral Link */}
      <div className="mb-6">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Your Referral Link
        </label>
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          <code className="flex-1 truncate rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-sm font-mono text-slate-100">
            {referralLink}
          </code>
          <button
            onClick={copyReferralLink}
            disabled={!isActive}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              isActive
                ? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-300 text-black shadow-[0_0_16px_rgba(250,204,21,0.7)] hover:brightness-110 active:scale-[0.97]'
                : 'cursor-not-allowed border border-slate-700 bg-slate-900/80 text-slate-500'
            }`}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        {copied && (
          <p className="mt-1 text-xs text-emerald-300">
            Referral link copied to clipboard!
          </p>
        )}
      </div>

      {/* Share Buttons */}
      <div className="mb-4">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Share on Social Media
        </label>
        <div className="flex space-x-3">
          <button
            onClick={shareOnTwitter}
            disabled={!isActive}
            className={`flex-1 flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              isActive
                ? 'bg-gradient-to-r from-sky-500 via-sky-400 to-sky-500 text-white shadow-[0_0_16px_rgba(56,189,248,0.7)] hover:brightness-110 active:scale-[0.97]'
                : 'cursor-not-allowed border border-slate-700 bg-slate-900/80 text-slate-500'
            }`}
          >
            <span className="mr-2">🐦</span>
            Twitter
          </button>
          <button
            onClick={shareOnTelegram}
            disabled={!isActive}
            className={`flex-1 flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              isActive
                ? 'bg-gradient-to-r from-sky-400 via-cyan-400 to-sky-500 text-white shadow-[0_0_16px_rgba(59,130,246,0.6)] hover:brightness-110 active:scale-[0.97]'
                : 'cursor-not-allowed border border-slate-700 bg-slate-900/80 text-slate-500'
            }`}
          >
            <span className="mr-2">📱</span>
            Telegram
          </button>
        </div>
      </div>

      {/* Referral Stats */}
      <div className="border-t border-slate-800 pt-4">
        <h4 className="mb-2 text-sm font-semibold text-slate-100">
          Referral Highlights
        </h4>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="rounded-2xl border border-yellow-400/60 bg-slate-950/80 p-3 shadow-[0_0_18px_rgba(250,204,21,0.4)]">
            <div className="text-lg font-bold text-yellow-300">50%</div>
            <div className="mt-1 text-xs text-slate-400">Direct Bonus</div>
          </div>
          <div className="rounded-2xl border border-purple-400/60 bg-slate-950/80 p-3 shadow-[0_0_18px_rgba(192,132,252,0.4)]">
            <div className="text-lg font-bold text-purple-300">12 Levels</div>
            <div className="mt-1 text-xs text-slate-400">Unilevel Earnings</div>
          </div>
        </div>
      </div>
    </div>
  );
};
