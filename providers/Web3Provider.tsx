"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { darkTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { config } from "../lib/wagmi";
import "@rainbow-me/rainbowkit/styles.css";
import { merge } from "lodash"; // ✅ Add lodash for safe theme merging

const queryClient = new QueryClient();

// ✅ Create base dark theme first
const baseTheme = darkTheme({
  accentColor: "#00D26A",
  accentColorForeground: "#000000",
  borderRadius: "large",
  fontStack: "system",
  overlayBlur: "small",
});

// ✅ Safely merge your custom color palette
const rapidostTheme = merge({}, baseTheme, {
  colors: {
    modalBackground: "#050307", // deep near-black
    modalBorder: "#2D2418", // dark warm border
    modalText: "#FDF7E3", // soft warm off-white
    modalTextSecondary: "#C8B27A", // muted gold for secondary text

    profileAction: "#F5C857", // primary gold
    profileActionHover: "#D9A63A", // darker gold on hover

    closeButton: "#F97373", // soft red for close/error action
    closeButtonBackground: "#1A1410", // dark background behind close

    connectButtonBackground: "#F5C857", // main button in gold
    connectButtonBackgroundError: "#B91C1C", // deeper red on error
    connectButtonInnerBackground: "#050307", // inner fill (black)
    connectButtonText: "#050307", // dark text on gold
    connectButtonTextError: "#050307", // same for error text

    generalBorder: "#2D2418", // consistent border color
    menuItemBackground: "#070608", // dark menu background

    standby: "#F59E0B", // amber/golden “standby / warning”
  },
});
export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rapidostTheme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
