// config/wallets.ts
import { WalletConfig, WalletId } from '@/types/wallet';

export const WALLETS: Record<WalletId, WalletConfig> = {
  rainbow: {
    id: 'rainbow',
    name: 'Rainbow',
    icon: 'https://raw.githubusercontent.com/rainbow-me/rainbow/master/src/assets/images/rainbow-512.png',
    deeplink: {
      ios: 'rainbow://wc?uri=',
      android: 'rainbow://wc?uri=',
      universal: 'https://rnbwapp.com/wc?uri='
    },
    downloadUrls: {
      ios: 'https://apps.apple.com/app/rainbow-ethereum-wallet/id1457119021',
      android: 'https://play.google.com/store/apps/details?id=me.rainbow'
    }
  },
  metamask: {
    id: 'metamask',
    name: 'MetaMask',
    icon: 'https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/metamask-fox.svg',
    deeplink: {
      ios: 'metamask://wc?uri=',
      android: 'metamask://wc?uri=',
      universal: 'https://metamask.app.link/wc?uri='
    },
    downloadUrls: {
      ios: 'https://apps.apple.com/app/metamask/id1438144202',
      android: 'https://play.google.com/store/apps/details?id=io.metamask'
    }
  },
  trust: {
    id: 'trust',
    name: 'Trust Wallet',
    icon: 'https://trustwallet.com/assets/images/favicon.png',
    deeplink: {
      ios: 'trust://wc?uri=',
      android: 'trust://wc?uri=',
      universal: 'https://link.trustwallet.com/wc?uri='
    },
    downloadUrls: {
      ios: 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409',
      android: 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp'
    }
  },
  coinbase: {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: 'https://static.alchemyapi.io/images/wallets/coinbase.png',
    deeplink: {
      ios: 'cbwallet://wc?uri=',
      android: 'com.coinbase.wallet://wc?uri=',
      universal: 'https://go.cb-w.com/wc?uri='
    },
    downloadUrls: {
      ios: 'https://apps.apple.com/app/coinbase-wallet-nfts-crypto/id1278383455',
      android: 'https://play.google.com/store/apps/details?id=org.toshi'
    }
  },
  phantom: {
    id: 'phantom',
    name: 'Phantom',
    icon: 'https://phantom.app/img/phantom-logo.svg',
    deeplink: {
      ios: 'phantom://wc?uri=',
      android: 'phantom://wc?uri=',
      universal: 'https://phantom.app/ul/browse/'
    },
    downloadUrls: {
      ios: 'https://apps.apple.com/app/phantom-solana-wallet/id1598432977',
      android: 'https://play.google.com/store/apps/details?id=app.phantom'
    }
  },
  rabby: {
    id: 'rabby',
    name: 'Rabby Wallet',
    icon: 'https://static.debank.com/image/wallet/logo/rabby.png',
    deeplink: {
      ios: 'rabby://wc?uri=',
      android: 'rabby://wc?uri=',
      universal: 'https://rabby.io/'
    },
    downloadUrls: {
      web: 'https://rabby.io'
    }
  },
  zerion: {
    id: 'zerion',
    name: 'Zerion',
    icon: 'https://static.debank.com/image/wallet/logo/zerion.png',
    deeplink: {
      ios: 'zerion://wc?uri=',
      android: 'zerion://wc?uri=',
      universal: 'https://wallet.zerion.io/wc?uri='
    },
    downloadUrls: {
      ios: 'https://apps.apple.com/app/zerion-defi-portfolio/id1456732568',
      android: 'https://play.google.com/store/apps/details?id=io.zerion.android'
    }
  }
};