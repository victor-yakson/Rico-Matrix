'use client';

import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

export  function ConnectWallet() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  const shortenValue = (value?: string) => {
    if (!value) return '';
    if (value.length <= 12) return value;
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
  };

  return (
    <RainbowConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              // Not connected
              if (!connected) {
                return (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={openConnectModal}
                    className="theme-button-primary min-w-[118px] px-3 py-2.5 text-sm md:min-w-[148px] md:px-4 md:text-[0.95rem]"
                  >
                    Connect Wallet
                  </motion.button>
                );
              }

              // Wrong chain
              if (chain.unsupported) {
                return (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={openChainModal}
                    className="rounded-2xl border border-red-500/40 bg-red-500/14 px-4 py-2.5 text-sm font-semibold text-red-100 shadow-[0_12px_30px_rgba(127,29,29,0.25)] transition-all hover:bg-red-500/18"
                  >
                    Wrong Network
                  </motion.button>
                );
              }

              // Connected state
              return (
                <>
                  <div className="hidden lg:flex items-center gap-2">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={openChainModal}
                      className="theme-button-ghost px-3 py-2 text-xs md:text-sm"
                    >
                      {chain.hasIcon && (
                        <div
                          className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center"
                          style={{ background: chain.iconBackground }}
                        >
                          {chain.iconUrl && (
                            <img
                              alt={chain.name ?? 'Chain icon'}
                              src={chain.iconUrl}
                              className="w-4 h-4"
                            />
                          )}
                        </div>
                      )}
                      <span>{chain.name}</span>
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={openAccountModal}
                      className="theme-button-primary px-3 py-2 text-xs md:text-sm"
                    >
                      {account.displayName}
                    </motion.button>
                  </div>

                  <div ref={mobileMenuRef} className="relative flex lg:hidden">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setMobileMenuOpen((prev) => !prev)}
                      className="theme-button-primary flex items-center gap-2 px-3 py-2 text-xs"
                    >
                      <span className="max-w-[92px] truncate">{shortenValue(account.displayName)}</span>
                      <span
                        className={`text-[0.65rem] transition-transform ${
                          mobileMenuOpen ? 'rotate-180' : 'rotate-0'
                        }`}
                        aria-hidden="true"
                      >
                        ▼
                      </span>
                    </motion.button>

                    <AnimatePresence>
                      {mobileMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.98 }}
                          transition={{ duration: 0.18, ease: 'easeOut' }}
                          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-3xl border border-white/10 bg-[rgba(6,9,15,0.98)] p-2 shadow-[0_22px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl"
                        >
                          <div className="rounded-2xl border border-yellow-400/15 bg-[linear-gradient(180deg,rgba(241,210,133,0.08),rgba(255,255,255,0.02))] px-3 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                                  Connected Wallet
                                </p>
                                <p className="mt-1 truncate text-sm font-semibold text-slate-100">
                                  {account.displayName}
                                </p>
                              </div>
                              {chain.hasIcon && (
                                <div
                                  className="flex h-8 w-8 items-center justify-center rounded-full overflow-hidden border border-white/10"
                                  style={{ background: chain.iconBackground }}
                                >
                                  {chain.iconUrl && (
                                    <img
                                      alt={chain.name ?? 'Chain icon'}
                                      src={chain.iconUrl}
                                      className="h-5 w-5"
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[11px] font-medium text-slate-300">
                              <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
                              {chain.name}
                            </div>
                          </div>

                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setMobileMenuOpen(false);
                                openChainModal();
                              }}
                              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-slate-200 transition hover:bg-white/4 hover:text-[var(--primary)]"
                            >
                              <span>Switch Network</span>
                              <span className="text-xs text-slate-400">{chain.name}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMobileMenuOpen(false);
                                openAccountModal();
                              }}
                              className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-slate-200 transition hover:bg-white/4 hover:text-[var(--primary)]"
                            >
                              <span>Wallet & Disconnect</span>
                              <span className="text-xs text-slate-400">Disconnect</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              );
            })()}
          </div>
        );
      }}
    </RainbowConnectButton.Custom>
  );
}
