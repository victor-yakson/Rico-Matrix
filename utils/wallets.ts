// config/wallets.ts
import { WalletConfig, WalletId } from '@/types/wallet';

export const WALLETS: Record<WalletId, WalletConfig> = {
  rainbow: {
    id: 'rainbow',
    name: 'Rainbow',
    icon: '/wallets/rainbow.png',
    deeplink: {
      ios: 'rainbow://',
      android: 'rainbow://',
      universal: 'https://rainbow.me',
    },
    downloadUrls: {
      ios: 'https://apps.apple.com/app/rainbow-ethereum-wallet/id1457119021',
      android: 'https://play.google.com/store/apps/details?id=me.rainbow',
    },
  },

  metamask: {
    id: 'metamask',
    name: 'MetaMask',
    icon: '/wallets/metamask-icon.svg',
    deeplink: {
      // MetaMask latest docs: https://link.metamask.io/dapp/{dappUrl}
      ios: 'https://link.metamask.io/dapp/',
      android: 'https://link.metamask.io/dapp/',
      universal: 'https://link.metamask.io/dapp/',
    },
    downloadUrls: {
      ios: 'https://apps.apple.com/app/metamask/id1438144202',
      android: 'https://play.google.com/store/apps/details?id=io.metamask',
    },
  },

  trust: {
    id: 'trust',
    name: 'Trust Wallet',
    icon: '/wallets/trust-wallet-icon.svg',
    deeplink: {
      // opens dapp in Trust’s in-app browser for Ethereum (coin_id=60)
      ios: 'trust://open_url?coin_id=60&url=',
      android: 'trust://open_url?coin_id=60&url=',
      universal: 'https://link.trustwallet.com/open_url?coin_id=60&url=',
    },
    downloadUrls: {
      ios: 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409',
      android: 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp',
    },
  },

  coinbase: {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: '/wallets/coinbase-logo-icon.svg',
    deeplink: {
      ios: 'cbwallet://',
      android: 'com.coinbase.wallet://',
      // Coinbase dapp deeplink style: https://go.cb-w.com/dapp?cb_url={dappUrl}
      universal: 'https://go.cb-w.com/dapp?cb_url=',
    },
    downloadUrls: {
      ios: 'https://apps.apple.com/app/coinbase-wallet-nfts-crypto/id1278383455',
      android: 'https://play.google.com/store/apps/details?id=org.toshi',
    },
  },

  phantom: {
    id: 'phantom',
    name: 'Phantom',
    icon: '/wallets/phantom.svg',
    deeplink: {
      ios: 'phantom://',
      android: 'phantom://',
      // Phantom docs: https://phantom.app/ul/browse/{encodedUrl}
      universal: 'https://phantom.app/ul/browse/',
    },
    downloadUrls: {
      ios: 'https://apps.apple.com/app/phantom-solana-wallet/id1598432977',
      android: 'https://play.google.com/store/apps/details?id=app.phantom',
    },
  },

  rabby: {
    id: 'rabby',
    name: 'Rabby Wallet',
    icon: '/wallets/rabby.svg',
    deeplink: {
      ios: 'rabby://',
      android: 'rabby://',
      universal: 'https://rabby.io/',
    },
    downloadUrls: {
      web: 'https://rabby.io',
    },
  },

  zerion: {
    id: 'zerion',
    name: 'Zerion',
    icon: '/wallets/zerion.png',
    deeplink: {
      ios: 'zerion://',
      android: 'zerion://',
      universal: 'https://wallet.zerion.io',
    },  
    downloadUrls: {
      ios: 'https://apps.apple.com/app/zerion-defi-portfolio/id1456732568',
      android: 'https://play.google.com/store/apps/details?id=io.zerion.android',
    },
  },

  safepal: {
    id: 'safepal',
    name: 'SafePal',
    icon: '/wallets/safepal.png',
    deeplink: {
      ios: 'safepal://',
      android: 'safepal://',
      universal: 'https://link.safepal.io',
    },
    downloadUrls: {
      ios: 'https://apps.apple.com/app/safepal-crypto-wallet/id1548297139',
      android: 'https://play.google.com/store/apps/details?id=io.safepal.wallet',
    },
  },

  brave: {
    id: 'brave',
    name: 'Brave Wallet',
    icon: 'https://brave.com/static-assets/images/brave-logo.svg',
    deeplink: {
      ios: 'brave://',
      android: 'brave://',
      universal: 'https://brave.app.link/',
    },
    downloadUrls: {
      ios: 'https://apps.apple.com/app/brave-private-web-browser/id1052879175',
      android: 'https://play.google.com/store/apps/details?id=com.brave.browser',
    },
  },
};
