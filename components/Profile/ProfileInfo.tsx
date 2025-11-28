'use client';

import { useAccount } from 'wagmi';
import { useState } from 'react';

interface ProfileInfoProps {
  userData: any;
}

export const ProfileInfo = ({ userData }: ProfileInfoProps) => {
  const { address } = useAccount();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getReaderLevel = () => {
    if (!userData?.exists) return 'New Reader';

    const totalChapters =
      (userData.track1Unlocked || 0) + (userData.track2Unlocked || 0);

    if (totalChapters >= 20) return 'Quantum Master';
    if (totalChapters >= 15) return 'Matrix Leader';
    if (totalChapters >= 10) return 'Chapter Expert';
    if (totalChapters >= 5) return 'Active Reader';
    return 'Beginner Reader';
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Quantum Master':
        return 'bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-400';
      case 'Matrix Leader':
        return 'bg-gradient-to-r from-violet-500 via-purple-600 to-fuchsia-500';
      case 'Chapter Expert':
        return 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300';
      case 'Active Reader':
        return 'bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-200';
      default:
        return 'bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800';
    }
  };

  const readerLevel = getReaderLevel();
  const levelColor = getLevelColor(readerLevel);

  const totalChapters = userData?.exists
    ? (userData.track1Unlocked || 0) + (userData.track2Unlocked || 0)
    : 0;
  const totalCycles = userData?.exists
    ? (userData.track1TotalCycles || 0) + (userData.track2TotalCycles || 0)
    : 0;

  return (
    <div className="rounded-2xl border border-yellow-500/20 bg-slate-950/80 p-6 shadow-[0_0_26px_rgba(0,0,0,0.8)] backdrop-blur-sm">
      <h2 className="text-2xl font-bold text-slate-50 mb-6">
        Profile Information
      </h2>

      {/* Reader Level Badge */}
      <div className="mb-6">
        <div
          className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold text-black shadow-[0_0_18px_rgba(250,204,21,0.6)] ${levelColor}`}
        >
          <span className="mr-2">⭐</span>
          <span className="uppercase tracking-[0.16em]">
            {readerLevel}
          </span>
        </div>
      </div>

      {/* Wallet Address */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-[0.16em] mb-2">
          Wallet Address
        </label>
        <div className="flex items-center space-x-2">
          <code className="flex-1 rounded-lg bg-slate-900/80 px-3 py-2 text-sm font-mono text-slate-100 truncate border border-slate-700/80">
            {address ? formatAddress(address) : 'Not connected'}
          </code>
          <button
            onClick={copyToClipboard}
            className="rounded-lg p-2 text-slate-400 hover:text-yellow-300 hover:bg-yellow-500/10 transition-colors"
            title="Copy address"
          >
            {copied ? '✅' : '📋'}
          </button>
        </div>
        {copied && (
          <p className="mt-1 text-xs text-emerald-300">
            Address copied to clipboard!
          </p>
        )}
      </div>

      {/* Reader Status */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-[0.16em] mb-2">
          Reader Status
        </label>
        <div
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
            userData?.exists
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40'
              : 'bg-amber-500/10 text-amber-200 border-amber-400/50'
          }`}
        >
          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
          {userData?.exists ? 'Active Reader' : 'Not Registered'}
        </div>
      </div>

      {/* Join Date (placeholder text for now) */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-[0.16em] mb-2">
          Member Since
        </label>
        <p className="text-sm text-slate-200">
          {userData?.exists
            ? 'Active member of the QuantuMatrix library.'
            : 'Join today to start reading and earning.'}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-300">
            {totalChapters}
          </div>
          <div className="text-xs uppercase tracking-[0.16em] text-slate-500 mt-1">
            Chapters
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-300">
            {totalCycles}
          </div>
          <div className="text-xs uppercase tracking-[0.16em] text-slate-500 mt-1">
            Cycles
          </div>
        </div>
      </div>
    </div>
  );
};
