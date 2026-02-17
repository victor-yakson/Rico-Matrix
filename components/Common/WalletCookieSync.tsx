"use client";

import { useAccount } from "wagmi";
import { useEffect } from "react";

const COOKIE_NAME = "walletConnected";

export default function WalletCookieSync() {
  const { isConnected, address } = useAccount();

  useEffect(() => {
    if (typeof document === "undefined") return;

    if (isConnected && address) {
      document.cookie = `${COOKIE_NAME}=1; path=/; max-age=86400; samesite=lax`;
    } else {
      document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
    }
  }, [isConnected, address]);

  return null;
}
