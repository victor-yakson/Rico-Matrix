'use client';

import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';

export  function ConnectWallet() {
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
                    className="
                      px-4 py-2 rounded-xl text-sm md:text-base font-semibold
                      bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-300
                      text-black shadow-[0_0_18px_rgba(250,204,21,0.7)]
                      hover:brightness-110 active:shadow-none
                      transition-all
                    "
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
                    className="
                      px-4 py-2 rounded-xl text-sm md:text-base font-semibold
                      bg-red-600 text-white
                      shadow-[0_0_16px_rgba(220,38,38,0.7)]
                      hover:bg-red-500 active:shadow-none
                      transition-all
                    "
                  >
                    Wrong Network
                  </motion.button>
                );
              }

              // Connected state
              return (
                <div className="flex items-center gap-2">
                  {/* Chain button */}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={openChainModal}
                    className="
                      px-3 py-2 rounded-xl text-xs md:text-sm font-medium
                      bg-slate-950/80 border border-slate-700/80
                      text-slate-100 flex items-center gap-2
                      backdrop-blur-sm
                      hover:border-yellow-400/70 hover:text-yellow-200
                      transition-all
                    "
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
                    <span className="hidden sm:inline">{chain.name}</span>
                    <span className="sm:hidden">Network</span>
                  </motion.button>

                  {/* Account button */}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={openAccountModal}
                    className="
                      px-3 py-2 rounded-xl text-xs md:text-sm font-semibold
                      bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-300
                      text-black shadow-[0_0_16px_rgba(250,204,21,0.7)]
                      hover:brightness-110 active:shadow-none
                      transition-all
                    "
                  >
                    {account.displayName}
                  </motion.button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </RainbowConnectButton.Custom>
  );
}
