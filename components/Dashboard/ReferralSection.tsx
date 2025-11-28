'use client';

import { useAccount } from 'wagmi';
import { useState } from 'react';

export const ReferralSection = () => {
  const { address } = useAccount();
  const [copied, setCopied] = useState(false);

  const referralLink = address 
    ? `${window.location.origin}?ref=${address}`
    : 'Connect your wallet to get referral link';

  const copyReferralLink = async () => {
    if (address) {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareOnTwitter = () => {
    const text = `Join me on RicoMatrix - Read real book chapters and earn rewards on blockchain! 🚀📚\n\nUse my referral link: ${referralLink}\n\n#RicoMatrix #Blockchain #EarnWhileYouRead`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-6 shadow-[0_0_28px_rgba(0,0,0,0.6)] backdrop-blur-sm">
      <h2 className="text-xl font-bold text-slate-50 mb-4">Referral Program</h2>
      
      {/* Referral Benefits */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-50 mb-3">Earn 50% Referral Bonus</h3>
        <ul className="text-sm text-slate-400 space-y-2">
          <li className="flex items-center">
            <span className="text-green-400 mr-2">✓</span>
            50% of referral's first purchase
          </li>
          <li className="flex items-center">
            <span className="text-green-400 mr-2">✓</span>
            Unilevel bonuses from downline
          </li>
          <li className="flex items-center">
            <span className="text-green-400 mr-2">✓</span>
            Build matrix network faster
          </li>
        </ul>
      </div>

      {/* Referral Link */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-400 mb-2">
          Your Referral Link
        </label>
        <div className="flex flex-col space-y-2">
          <code className="flex-1 bg-slate-800/50 px-3 py-2 rounded-lg text-sm font-mono text-slate-200 truncate border border-slate-700">
            {referralLink}
          </code>
          <button
            onClick={copyReferralLink}
            disabled={!address}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              address 
                ? 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.5)]' 
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
        {copied && (
          <p className="text-green-400 text-xs mt-1">Link copied to clipboard!</p>
        )}
      </div>

      {/* Share Button */}
      <div className="mb-4">
        <button
          onClick={shareOnTwitter}
          disabled={!address}
          className={`w-full flex items-center justify-center px-4 py-3 rounded-lg text-sm font-medium transition-all ${
            address 
              ? 'bg-blue-500 hover:bg-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' 
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          <span className="mr-2">🐦</span>
          Share on Twitter
        </button>
      </div>

      {/* Referral Stats */}
      <div className="border-t border-slate-700 pt-4">
        <h4 className="text-sm font-medium text-slate-400 mb-2">Referral Benefits</h4>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
            <div className="text-lg font-bold text-blue-400">50%</div>
            <div className="text-xs text-slate-400">Direct Bonus</div>
          </div>
          <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20">
            <div className="text-lg font-bold text-purple-400">12 Levels</div>
            <div className="text-xs text-slate-400">Unilevel</div>
          </div>
        </div>
      </div>
    </div>
  );
};