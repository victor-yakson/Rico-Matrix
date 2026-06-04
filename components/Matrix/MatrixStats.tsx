'use client';

import { useTranslations } from 'next-intl';

interface MatrixStatsProps {
  userData: any;
}

export const MatrixStats = ({ userData }: MatrixStatsProps) => {
  const t = useTranslations('Matrix.MatrixStats');

  const stats = [
    {
      name: t('stats.x3Earnings.name'),
      value: userData?.exists
        ? `$${Number(userData.track1TotalEarned || 0).toFixed(2)}`
        : '$0.00',
      description: t('stats.x3Earnings.description'),
      accent: 'from-yellow-400 via-amber-500 to-yellow-300',
      dot: 'bg-yellow-300',
      border: 'border-yellow-400/60',
      glow: 'shadow-[0_0_24px_rgba(250,204,21,0.45)]',
    },
    {
      name: t('stats.x6Earnings.name'),
      value: userData?.exists
        ? `$${Number(userData.track2TotalEarned || 0).toFixed(2)}`
        : '$0.00',
      description: t('stats.x6Earnings.description'),
      accent: 'from-yellow-400 via-amber-500 to-yellow-300',
      dot: 'bg-yellow-300',
      border: 'border-yellow-400/60',
      glow: 'shadow-[0_0_24px_rgba(192,132,252,0.45)]',
    },
    {
      name: t('stats.x3Cycles.name'),
      value: userData?.exists
        ? String(userData.track1TotalCycles || 0)
        : '0',
      description: t('stats.x3Cycles.description'),
      accent: 'from-amber-400 via-yellow-300 to-amber-200',
      dot: 'bg-amber-300',
      border: 'border-yellow-400/55',
      glow: 'shadow-[0_0_24px_rgba(184,128,54,0.42)]',
    },
    {
      name: t('stats.x6Cycles.name'),
      value: userData?.exists
        ? String(userData.track2TotalCycles || 0)
        : '0',
      description: t('stats.x6Cycles.description'),
      accent: 'from-yellow-300 via-amber-400 to-yellow-500',
      dot: 'bg-yellow-300',
      border: 'border-yellow-400/45',
      glow: 'shadow-[0_0_24px_rgba(184,128,54,0.42)]',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`
            relative overflow-hidden rounded-2xl border bg-slate-950/80 p-5
            backdrop-blur-sm transition-all duration-300
            ${stat.border} ${stat.glow}
            hover:-translate-y-1
          `}
        >
          {/* Accent gradient strip at the top */}
          <div
            className={`
              pointer-events-none absolute inset-x-0 top-0 h-1
              bg-gradient-to-r ${stat.accent}
            `}
          />

          <div className="flex items-center justify-between mb-2 relative">
            <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              {stat.name}
            </dt>
            <span
              className={`w-2 h-2 rounded-full ${stat.dot} shadow-[0_0_10px_rgba(255,255,255,0.5)]`}
            />
          </div>

          <dd className="relative text-2xl md:text-3xl font-bold text-slate-50">
            {stat.value}
          </dd>

          <p className="relative mt-1.5 text-sm text-slate-400">
            {stat.description}
          </p>
        </div>
      ))}
    </div>
  );
};