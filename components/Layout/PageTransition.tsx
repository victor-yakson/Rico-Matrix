'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

interface PageTransitionProps {
  children: ReactNode;
}

export const PageTransition = ({ children }: PageTransitionProps) => {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <>
        <motion.div
          key={`overlay-${pathname}`}
          className="transition-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.4, times: [0, 0.4, 1], ease: "easeInOut" }}
        >
          <div className="transition-overlay-content">
            <span className="transition-orb" />
            <span className="transition-text">Read • Earn • Own</span>
          </div>
          <div className="transition-progress">
            <div className="transition-progress-fill" />
          </div>
        </motion.div>

        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{
            duration: 0.25,
            ease: 'easeOut',
          }}
          className="min-h-[calc(100vh-4rem)]" // adjust if needed
        >
          {children}
        </motion.div>
      </>
    </AnimatePresence>
  );
};
