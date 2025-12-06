import "@rainbow-me/rainbowkit/styles.css";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { bsc, sepolia } from "wagmi/chains";
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
    [sepolia.id]: http(
      "https://eth-sepolia.g.alchemy.com/v2/SumeusvlJ5wEykn9Oz8UZ"
    ),
    [bsc.id]: http(
      "https://bnb-mainnet.g.alchemy.com/v2/SumeusvlJ5wEykn9Oz8UZ"
    ),
  },
  ssr: true,
});
