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
    
    const totalChapters = (userData.track1Unlocked || 0) + (userData.track2Unlocked || 0);
    
    if (totalChapters >= 20) return 'Quantum Master';
    if (totalChapters >= 15) return 'Matrix Leader';
    if (totalChapters >= 10) return 'Chapter Expert';
    if (totalChapters >= 5) return 'Active Reader';
    return 'Beginner Reader';
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Quantum Master': return 'bg-gradient-to-r from-purple-600 to-pink-600';
      case 'Matrix Leader': return 'bg-gradient-to-r from-blue-600 to-purple-600';
      case 'Chapter Expert': return 'bg-gradient-to-r from-green-500 to-blue-500';
      case 'Active Reader': return 'bg-gradient-to-r from-yellow-500 to-orange-500';
      default: return 'bg-gradient-to-r from-gray-500 to-gray-700';
    }
  };

  const readerLevel = getReaderLevel();
  const levelColor = getLevelColor(readerLevel);

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-6 shadow-[0_0_28px_rgba(0,0,0,0.6)] backdrop-blur-sm">
      <h2 className="text-xl font-bold text-slate-50 mb-6">Profile Information</h2>
      
      {/* Reader Level Badge */}
      <div className="mb-6">
        <div className={`inline-flex items-center px-4 py-2 rounded-full text-white text-sm font-semibold ${levelColor} shadow-lg`}>
          <span className="mr-2">⭐</span>
          {readerLevel}
        </div>
      </div>

      {/* Wallet Address */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-400 mb-2">
          Wallet Address
        </label>
        <div className="flex items-center space-x-2">
          <code className="flex-1 bg-slate-800/50 px-3 py-2 rounded-lg text-sm font-mono text-slate-200 truncate border border-slate-700">
            {address ? formatAddress(address) : 'Not connected'}
          </code>
          <button
            onClick={copyToClipboard}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors border border-slate-700"
            title="Copy address"
          >
            {copied ? '✅' : '📋'}
          </button>
        </div>
        {copied && (
          <p className="text-green-400 text-xs mt-1">Address copied!</p>
        )}
      </div>

      {/* Reader Status */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-400 mb-2">
          Reader Status
        </label>
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          userData?.exists 
            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
        }`}>
          {userData?.exists ? 'Active Reader' : 'Not Registered'}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-400">
            {userData?.exists ? (userData.track1Unlocked + userData.track2Unlocked) : 0}
          </div>
          <div className="text-xs text-slate-400">Chapters</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-400">
            {userData?.exists ? (userData.track1TotalCycles + userData.track2TotalCycles) : 0}
          </div>
          <div className="text-xs text-slate-400">Cycles</div>
        </div>
      </div>
    </div>
  );
};