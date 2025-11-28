"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, http, WagmiProvider } from "wagmi";
import { darkTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { bsc, mainnet } from "viem/chains";

const config = createConfig({
  chains: [mainnet, bsc],
  transports: {
    [mainnet.id]: http(
      "https://eth-sepolia.g.alchemy.com/v2/SumeusvlJ5wEykn9Oz8UZ"
    ),
    [bsc.id]: http(
      "https://bnb-mainnet.g.alchemy.com/v2/SumeusvlJ5wEykn9Oz8UZ"
    ),
  },
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
