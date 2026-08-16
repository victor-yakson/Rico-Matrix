import "@rainbow-me/rainbowkit/styles.css";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { bsc, base, mainnet, polygon } from "wagmi/chains";
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

const bscRpcCandidates = [
  process.env.NEXT_PUBLIC_BSC_RPC_URL,
  "https://bsc-dataseed.binance.org",
  "https://rpc.ankr.com/bsc",
].filter((url): url is string => Boolean(url && url.trim()));

const ethRpcCandidates = [
  process.env.NEXT_PUBLIC_ETH_RPC_URL,
  "https://ethereum-rpc.publicnode.com",
  "https://rpc.ankr.com/eth",
].filter((url): url is string => Boolean(url && url.trim()));

const baseRpcCandidates = [
  process.env.NEXT_PUBLIC_BASE_RPC_URL,
  "https://mainnet.base.org",
  "https://base-rpc.publicnode.com",
].filter((url): url is string => Boolean(url && url.trim()));

const polygonRpcCandidates = [
  process.env.NEXT_PUBLIC_POLYGON_RPC_URL,
  "https://polygon-rpc.com",
  "https://polygon-bor-rpc.publicnode.com",
].filter((url): url is string => Boolean(url && url.trim()));

export const config = getDefaultConfig({
  appName: "Rico Matrix",
  projectId: <string>process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID, // WalletConnect projectId
  chains: [bsc, mainnet, base, polygon],
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
    [bsc.id]: fallback(bscRpcCandidates.map((url) => http(url))),
    [mainnet.id]: fallback(ethRpcCandidates.map((url) => http(url))),
    [base.id]: fallback(baseRpcCandidates.map((url) => http(url))),
    [polygon.id]: fallback(polygonRpcCandidates.map((url) => http(url))),
  },
  ssr: true,
});
