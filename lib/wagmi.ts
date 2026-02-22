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
import { http } from "viem";

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
    [bsc.id]: http(
      process.env.NEXT_PUBLIC_BSC_RPC_URL ??
        "https://bsc-mainnet.infura.io/v3/f7f365c800de4116af2875df31e7255c"
    ),
  },
  ssr: true,
});
