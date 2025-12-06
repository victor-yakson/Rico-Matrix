// components/AutoConnectOnLoad.tsx
'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';

export function AutoConnectOnLoad() {
  const searchParams = useSearchParams();
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  useEffect(() => {
    const shouldAutoConnect = searchParams.get('autoconnect') === '1';

    if (shouldAutoConnect && !isConnected && openConnectModal) {
      openConnectModal(); // opens RainbowKit modal inside the wallet's in-app browser
    }
  }, [searchParams, isConnected, openConnectModal]);

  return null;
}
