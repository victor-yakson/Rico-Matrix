// WalletDeepLinks.tsx
import React, { useMemo, useState } from 'react';

const isMobile = () => {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

export function WalletDeepLinks() {
  const [open, setOpen] = useState(false);

  const dappUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return encodeURIComponent('https://your-dapp.com'); // fallback
    }
    // strip hash to avoid weirdness
    const url = window.location.href.split('#')[0];
    return encodeURIComponent(url);
  }, []);

  const wallets = [
    {
      id: 'metamask',
      name: 'MetaMask',
      // opens your dapp inside MetaMask in-app browser
      href: `https://link.metamask.io/dapp/${decodeURIComponent(dappUrl)}`,
    },
    {
      id: 'trust',
      name: 'Trust Wallet',
      // opens your dapp inside Trust Wallet in-app browser
      href: `https://link.trustwallet.com/open_url?url=${dappUrl}`,
    },
    // add more if you want (Rainbow, Coinbase via docs/SDKs)
  ];

  if (!isMobile()) return null;

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: '10px 16px',
          borderRadius: 999,
          border: '1px solid #444',
          background: '#111',
          color: '#fff',
          fontSize: 14,
          marginLeft: 8,
        }}
      >
        Open in wallet app
      </button>

      {/* Very simple modal */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#111',
              borderRadius: 16,
              padding: 16,
              width: '90%',
              maxWidth: 360,
            }}
          >
            <h3 style={{ margin: 0, marginBottom: 12, color: '#fff' }}>
              Open this dApp in:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {wallets.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => {
                    // must happen directly in click handler:
                    window.location.href = wallet.href;
                  }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 999,
                    border: '1px solid #333',
                    background: '#1b1b1b',
                    color: '#fff',
                    textAlign: 'left',
                  }}
                >
                  {wallet.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
