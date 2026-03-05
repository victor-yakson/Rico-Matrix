import "@rainbow-me/rainbowkit/styles.css";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { bsc } from "wagmi/chains";
import {
  rainbowWallet,
  walletConnectWallet,
  trustWallet,
  safepalWallet,
  injectedWallet,
  braveWallet,
  rabbyWallet,
  phantomWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { fallback, http } from "viem";

const rpcCandidates = [
  process.env.NEXT_PUBLIC_BSC_RPC_URL,
  "https://bsc-dataseed.binance.org",
  "https://rpc.ankr.com/bsc",
].filter((url): url is string => Boolean(url && url.trim()));

export const config = getDefaultConfig({
  appName: "Rico Matrix",
  projectId: <string>process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID, // WalletConnect projectId
  chains: process.env.NODE_ENV === "development" ? [bsc] : [bsc],
  wallets: [
    {
      groupName: "Recommended",
      wallets: [
        rainbowWallet,
        walletConnectWallet,
        safepalWallet,
        trustWallet,
        injectedWallet,
        braveWallet,
        rabbyWallet,
        phantomWallet,
      ],
    },
  ],
  transports: {
    [bsc.id]: fallback(rpcCandidates.map((url) => http(url))),
  },
  ssr: true,
});
