// services/deeplink.ts
import { WalletId, WalletConfig } from '@/types/wallet';
import { WALLETS } from '@/utils/wallets';
import { detectPlatform } from '@/utils/platform';

export class DeeplinkService {
  /**
   * Create a deep link URL for a specific wallet
   */
  static createWalletDeepLink(walletId: WalletId, dappUrl: string): string {
    const wallet = WALLETS[walletId];
    const platform = detectPlatform();
    const encodedUrl = encodeURIComponent(dappUrl);
    
    let deepLink = '';
    
    switch (platform) {
      case 'ios':
        deepLink = `${wallet.deeplink.ios}${encodedUrl}`;
        break;
      case 'android':
        deepLink = `${wallet.deeplink.android}${encodedUrl}`;
        break;
      default:
        deepLink = `${wallet.deeplink.universal}${encodedUrl}`;
    }
    
    return deepLink;
  }

  /**
   * Open wallet with deep link and fallback to download page
   */
  static async openWallet(walletId: WalletId): Promise<void> {
    const wallet = WALLETS[walletId];
    const dappUrl = window.location.href;
    const deepLink = this.createWalletDeepLink(walletId, dappUrl);
    
    // Store the wallet preference
    localStorage.setItem('preferredWallet', walletId);
    localStorage.setItem('lastConnectionAttempt', Date.now().toString());
    

    console.log('Deep link to open:', deepLink);
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
    
    if (platform === 'ios' && wallet.downloadUrls.ios) {
      downloadUrl = wallet.downloadUrls.ios;
    } else if (platform === 'android' && wallet.downloadUrls.android) {
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