// services/deeplink.ts
import { WalletId, WalletConfig } from "@/types/wallet";
import { WALLETS } from "@/utils/wallets";
import { detectPlatform } from "@/utils/platform";

export class DeeplinkService {
  /**
   * Create a deep link URL for a specific wallet
   */
  // services/deeplink.ts
  // services/deeplink.ts
static createWalletDeepLink(walletId: WalletId, dappUrl: string): string {
  const wallet = WALLETS[walletId];
  const platform = detectPlatform();

  const mode: 'ios' | 'android' | 'universal' =
    platform === 'ios' ? 'ios' : platform === 'android' ? 'android' : 'universal';

  const base = wallet.deeplink[mode];

  // --- 1) Normalize the DApp URL and make sure ?ref stays ---

  let url: URL;
  try {
    url = new URL(dappUrl);
  } catch {
    // Fallback if dappUrl is relative or malformed
    url = new URL(dappUrl, window.location.origin);
  }

  // If you sometimes store ref elsewhere (e.g. localStorage), you can *force* it here:
  // const storedRef = localStorage.getItem('ref');
  // if (!url.searchParams.get('ref') && storedRef) {
  //   url.searchParams.set('ref', storedRef);
  // }

  // Add autoconnect flag but DO NOT touch existing 'ref'
  url.searchParams.set('autoconnect', '1');

  const autoConnectUrl = url.toString(); // e.g. https://rico-matrix.vercel.app/matrix?ref=0xABC&autoconnect=1

  // --- 2) Wallet-specific deeplink formats ---

  switch (walletId) {
    case 'metamask': {
      // MetaMask: https://link.metamask.io/dapp/<dapp-domain-or-url>
      // (They don’t want the protocol, but they *do* allow path + query)
      const cleanUrl = autoConnectUrl.replace(/^https?:\/\//, '');
      return `${base}${cleanUrl}`;
    }

    case 'trust': {
      // Trust: https://link.trustwallet.com/open_url?coin_id=60&url=<encoded>
      // Here we MUST encode or the outer query breaks (&ref, &autoconnect, etc.)
      return `${base}${encodeURIComponent(autoConnectUrl)}`;
    }

    case 'coinbase': {
      // Coinbase: https://go.cb-w.com/dapp?cb_url=<encoded>
      return `${base}${encodeURIComponent(autoConnectUrl)}`;
    }

    case 'phantom': {
      // Phantom: https://phantom.app/ul/browse/<encoded>
      return `${base}${encodeURIComponent(autoConnectUrl)}`;
    }

    // SafePal + others: just open the DApp URL directly (they don't have a stable public dapp deeplink scheme)
    case 'safepal':
    default: {
      return autoConnectUrl;
    }
  }
}


  /**
   * Open wallet with deep link and fallback to download page
   */
  static async openWallet(walletId: WalletId): Promise<void> {
    const wallet = WALLETS[walletId];
    const dappUrl = window.location.href;
    const deepLink = this.createWalletDeepLink(walletId, dappUrl);
    console.log(`Opening wallet: ${walletId} with deep link: ${deepLink}`);
    // Store the wallet preference
    localStorage.setItem("preferredWallet", walletId);
    localStorage.setItem("lastConnectionAttempt", Date.now().toString());

    // Try to open the deep link
    this.openDeepLink(deepLink);

    // Set fallback to download page if app isn't installed
    setTimeout(() => {
      if (!this.wasAppOpened()) {
        this.openFallback(wallet);
      }
    }, 2000);
  }

  /**
   * Attempt to open deep link
   */
  private static openDeepLink(link: string): void {
    // Method 1: Direct location change (works for iOS)
    window.location.href = link;

    // Method 2: Create hidden iframe (works for Android)
    setTimeout(() => {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = link;
      document.body.appendChild(iframe);

      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 100);
  }

  /**
   * Check if app was successfully opened
   */
  private static wasAppOpened(): boolean {
    const lastAttempt = localStorage.getItem("lastConnectionAttempt");
    if (!lastAttempt) return false;

    const timeSinceAttempt = Date.now() - parseInt(lastAttempt);
    // If page is still visible after 1.5 seconds, app probably didn't open
    return timeSinceAttempt < 1500 && document.hidden;
  }

  /**
   * Open wallet download page
   */
  private static openFallback(wallet: WalletConfig): void {
    const platform = detectPlatform();
    let downloadUrl = wallet.downloadUrls.web;

    if (platform === "ios" && wallet.downloadUrls.ios) {
      downloadUrl = wallet.downloadUrls.ios;
    } else if (platform === "android" && wallet.downloadUrls.android) {
      downloadUrl = wallet.downloadUrls.android;
    }

    if (downloadUrl) {
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    }
  }

  /**
   * Get recommended wallets based on platform
   */
  static getRecommendedWallets(): WalletId[] {
    const platform = detectPlatform();

    const commonWallets: WalletId[] = ["metamask", "rainbow", "coinbase"];

    if (platform === "ios") {
      return [...commonWallets, "phantom", "zerion"];
    }

    if (platform === "android") {
      return [...commonWallets, "trust", "rabby"];
    }

    return commonWallets;
  }
}
