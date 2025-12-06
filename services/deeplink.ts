// services/deeplink.ts
import { WalletId, WalletConfig } from '@/types/wallet';
import { WALLETS } from '@/utils/wallets';
import { detectPlatform } from '@/utils/platform';

export class DeeplinkService {
  /**
   * Create a deep link URL for a specific wallet
   * - Adds ?autoconnect=1 to the DApp URL so the page knows to auto-trigger wallet connect
   * - Uses wallet-specific deeplink formats where documented
   */
  static createWalletDeepLink(walletId: WalletId, dappUrl: string): string {
    const wallet = WALLETS[walletId];
    const platform = detectPlatform();

    // Decide which deeplink base to consider (for wallets that actually use it)
    const mode: 'ios' | 'android' | 'universal' =
      platform === 'ios' ? 'ios' : platform === 'android' ? 'android' : 'universal';

    const base = wallet.deeplink[mode];

    // 1) Ensure our DApp URL has ?autoconnect=1 so the DApp can auto-open the wallet modal
    let autoConnectUrl: string;

    try {
      const url = new URL(dappUrl);
      url.searchParams.set('autoconnect', '1');
      autoConnectUrl = url.toString();
    } catch {
      const sep = dappUrl.includes('?') ? '&' : '?';
      autoConnectUrl = `${dappUrl}${sep}autoconnect=1`;
    }

    // 2) Build per-wallet deeplink
    switch (walletId) {
      case 'metamask': {
        // MetaMask: https://link.metamask.io/dapp/<dapp-domain-or-url>
        const urlWithoutProtocol = autoConnectUrl.replace(/^https?:\/\//, '');
        return `${base}${encodeURIComponent(urlWithoutProtocol)}`;
      }

      case 'trust': {
        // Trust config (universal): 'https://link.trustwallet.com/open_url?coin_id=60&url='
        return `${base}${encodeURIComponent(autoConnectUrl)}`;
      }

      case 'coinbase': {
        // Coinbase config (universal): 'https://go.cb-w.com/dapp?cb_url='
        return `${base}${encodeURIComponent(autoConnectUrl)}`;
      }

      case 'phantom': {
        // Phantom config (universal): 'https://phantom.app/ul/browse/'
        return `${base}${encodeURIComponent(autoConnectUrl)}`;
      }

      // IMPORTANT: for SafePal (and others without a proper DApp deeplink),
      // do NOT smash the base + encoded URL together.
      // Just return the DApp URL itself and let the user open it in SafePal's DApp browser.
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
    console.log('Deep link to open:', deepLink);

    // Store the wallet preference
    localStorage.setItem('preferredWallet', walletId);
    localStorage.setItem('lastConnectionAttempt', Date.now().toString());

    try {
      // Try to open the deep link
      this.openDeepLink(deepLink);

      // Set fallback to download page if app isn't installed
      setTimeout(() => {
        if (!this.wasAppOpened()) {
          this.openFallback(wallet);
        }
      }, 2000);
    } catch (err) {
      console.error('Failed to open wallet:', err);
      throw err;
    }
  }

  /**
   * Attempt to open deep link
   */
  private static openDeepLink(link: string): void {
    // Guard against totally malformed URLs throwing in browsers:
    try {
      // Quick validation (will throw on something like 'https://link.safepal.iohttps%3A...')
      // eslint-disable-next-line no-new
      new URL(link);
    } catch {
      console.error('Invalid deeplink URL:', link);
      return;
    }

    // Method 1: Direct location change (works for iOS)
    window.location.href = link;

    // Method 2: Hidden iframe (sometimes helps Android)
    setTimeout(() => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
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
    const lastAttempt = localStorage.getItem('lastConnectionAttempt');
    if (!lastAttempt) return false;

    const timeSinceAttempt = Date.now() - parseInt(lastAttempt, 10);
    // If page is still visible after 1.5 seconds, app probably didn't open
    return timeSinceAttempt < 1500 && document.hidden;
  }

  /**
   * Open wallet download page
   */
  private static openFallback(wallet: WalletConfig): void {
    const platform = detectPlatform();
    let downloadUrl = wallet.downloadUrls?.web;

    if (platform === 'ios' && wallet.downloadUrls?.ios) {
      downloadUrl = wallet.downloadUrls.ios;
    } else if (platform === 'android' && wallet.downloadUrls?.android) {
      downloadUrl = wallet.downloadUrls.android;
    }

    if (downloadUrl) {
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    }
  }

  /**
   * Get recommended wallets based on platform
   */
  static getRecommendedWallets(): WalletId[] {
    const platform = detectPlatform();

    const commonWallets: WalletId[] = ['metamask', 'rainbow', 'coinbase'];

    if (platform === 'ios') {
      return [...commonWallets, 'phantom', 'zerion'];
    }

    if (platform === 'android') {
      return [...commonWallets, 'trust', 'rabby'];
    }

    return commonWallets;
  }
}
