// components/AutoConnectOnLoad.tsx
'use client';

import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';

export function AutoConnectOnLoad() {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const shouldAutoConnect = params.get('autoconnect') === '1';

    if (shouldAutoConnect && !isConnected && openConnectModal) {
      openConnectModal();
    }
  }, [isConnected, openConnectModal]);

  return null;
}
