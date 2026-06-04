'use client';

import { useAccount } from 'wagmi';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

export const ReferralSection = () => {
  const { address } = useAccount();
  const [copied, setCopied] = useState(false);
  const t = useTranslations('Dashboard.referral');

  const getReferralLink = () => {
    if (!address || typeof window === 'undefined') {
      return t('link.noWallet');
    }
    return `${window.location.origin}?ref=${address}`;
  };

  const referralLink = getReferralLink();

  const copyReferralLink = async () => {
    if (!address) return;
    
    try {
      // Modern clipboard API
      await navigator.clipboard.writeText(referralLink);
    } catch (err) {
      console.error('Clipboard API failed:', err);
      
      // Fallback for older browsers or non-HTTPS
      try {
        const textArea = document.createElement('textarea');
        textArea.value = referralLink;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        textArea.style.pointerEvents = 'none';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        textArea.setSelectionRange(0, 99999); // For mobile devices
        
        const successful = document.execCommand('copy');
        if (!successful) {
          throw new Error('execCommand failed');
        }
        
        document.body.removeChild(textArea);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
        // Last resort: show the link for manual copy
        alert(`${t('link.copyFailed')}\n\n${referralLink}`);
        return;
      }
    }
    
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnTwitter = () => {
    if (!address) return;
    
    const text = t('share.twitterText', { link: referralLink });
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-6 shadow-[0_0_28px_rgba(0,0,0,0.6)] backdrop-blur-sm">
      <h2 className="text-xl font-bold text-slate-50 mb-4">
        {t('title')}
      </h2>
      
      {/* Referral Benefits */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-50 mb-3">
          {t('benefits.title')}
        </h3>
        <ul className="text-sm text-slate-400 space-y-2">
          {t.raw('benefits.items').map((item: string, index: number) => (
            <li key={index} className="flex items-center">
              <span className="text-amber-300 mr-2">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Referral Link */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-400 mb-2">
          {t('link.label')}
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
            {copied ? t('link.copied') : t('link.copy')}
          </button>
        </div>
        {copied && (
          <p className="text-amber-300 text-xs mt-1 animate-pulse">
            {t('link.copiedMessage')}
          </p>
        )}
      </div>

      {/* Share Button */}
      <div className="mb-4">
        <button
          onClick={shareOnTwitter}
          disabled={!address}
          className={`w-full flex items-center justify-center px-4 py-3 rounded-lg text-sm font-medium transition-all ${
            address 
              ? 'bg-yellow-400 hover:bg-yellow-300 text-black shadow-[0_0_15px_rgba(245,158,11,0.35)]' 
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          <span className="mr-2">🐦</span>
          {t('share.button')}
        </button>
      </div>

      {/* Referral Stats */}
      <div className="border-t border-slate-700 pt-4">
        <h4 className="text-sm font-medium text-slate-400 mb-2">
          {t('stats.title')}
        </h4>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20">
            <div className="text-lg font-bold text-yellow-400">50%</div>
            <div className="text-xs text-slate-400">
              {t('stats.directBonus')}
            </div>
          </div>
          <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20">
            <div className="text-lg font-bold text-yellow-400">20%</div>
            <div className="text-xs text-slate-400">
              {t('stats.unilevel')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
