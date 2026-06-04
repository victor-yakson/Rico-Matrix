'use client';

import { Header } from '../../components/Navigation/Header';
import { useAccount } from 'wagmi';
import { ProfileStats } from '../../components/Profile/ProfileStats';
import { ProfileInfo } from '../../components/Profile/ProfileInfo';
import { ReferralSection } from '../../components/Profile/ReferralSection';
import { useQuantuMatrix } from '../../hooks/useQuantuMatrix';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

export default function ProfilePage() {
  const { isConnected, address } = useAccount();
  const { userData, refetchUserData } = useQuantuMatrix();
  const [mounted, setMounted] = useState(false);
  const t = useTranslations('ProfilePage');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (address && isConnected) {
      refetchUserData();
    }
  }, [address, isConnected, refetchUserData]);

  // Loading / hydration-safe state
  if (!mounted) {
    return (
      <>
        <Header />
        <div className="theme-shell flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4">
          <div className="text-center mb-8">
            <p className="theme-kicker justify-center mb-2">
              {t('loading.label')}
            </p>
            <h1 className="theme-title mb-3 text-3xl md:text-4xl">
              {t('loading.title')}
            </h1>
            <p className="theme-copy text-sm md:text-base">
              {t('loading.description')}
            </p>
          </div>
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-yellow-400 border-t-transparent" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="theme-shell theme-page-shell pb-20 md:pb-8">
        <div className="theme-container px-4">
          {/* Header */}
          <div className="mx-auto mb-8 max-w-4xl text-center md:mb-10">
            <p className="theme-kicker justify-center mb-3">
              {t('header.label')}
            </p>
            <h1 className="theme-title mb-3 text-3xl md:text-4xl">
              {t('header.title')}
            </h1>
            <p className="theme-copy max-w-2xl mx-auto text-sm md:text-base">
              {t('header.description')}
            </p>
          </div>

          {/* Profile Content */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left Column - Profile Info & Referral */}
            <div className="space-y-6 lg:col-span-1">
              {/* Expect these components to be themed as well; container them in dark cards if needed */}
              <div className="theme-panel-soft p-5">
                <ProfileInfo userData={userData} />
              </div>

              <div className="theme-panel-soft p-5">
                <ReferralSection />
              </div>
            </div>

            {/* Right Column - Stats */}
            <div className="lg:col-span-2">
              <div className="theme-panel p-5 md:p-6">
                <ProfileStats userData={userData} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
