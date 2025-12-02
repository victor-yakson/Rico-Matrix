// types/wallet.ts
export interface WalletConfig {
  id: string;
  name: string;
  icon: string;
  deeplink: {
    ios: string;
    android: string;
    universal: string;
  };
  downloadUrls: {
    ios?: string;
    android?: string;
    web?: string;
  };
}

export type WalletId = 'rainbow' | 'metamask' | 'trust' | 'coinbase' | 'phantom' | 'rabby' | 'zerion';