"use client";

import { ConnectWallet } from "../Common/ConnectWallet";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import MobileWalletConnector from "../Common/MobileWalletConnector";

export const Header = () => {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navigation = [
    { name: "Dashboard", href: "/", current: pathname === "/", icon: "🏠" },
    {
      name: "Chapters",
      href: "/chapters",
      current: pathname === "/chapters",
      icon: "📚",
    },
    {
      name: "Matrix",
      href: "/matrix",
      current: pathname === "/matrix",
      icon: "🔗",
    },
    {
      name: "Royalty",
      href: "/royalty",
      current: pathname === "/royalty",
      icon: "💰",
    },
    {
      name: "Profile",
      href: "/profile",
      current: pathname === "/profile",
      icon: "👤",
    },
  ];

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Skeleton while mounting (avoids hydration mismatches)
  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 bg-black/80 border-b border-yellow-500/20 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo skeleton */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-slate-800 rounded-lg animate-pulse" />
              <span className="text-xl font-bold text-slate-100 hidden sm:block">
                RICO MATRIX
              </span>
              <span className="text-xl font-bold text-slate-100 sm:hidden">
                RM
              </span>
            </div>
            <div className="w-32 h-10 bg-slate-800 rounded-lg animate-pulse" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-yellow-500/20 bg-black/80 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.8)]">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16 gap-3">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center space-x-2 flex-shrink-0"
            >
              <div className="relative w-8 h-8">
                <Image
                  src="/logo.png"
                  alt="Rico Matrix Logo"
                  width={32}
                  height={32}
                  className="object-contain"
                  priority
                />
              </div>
              <span className="text-xl font-bold text-slate-50 hidden sm:block tracking-wide">
                RICO MATRIX
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-4 lg:space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap border border-transparent ${
                    item.current
                      ? "bg-yellow-500/10 text-yellow-300 border-yellow-400/50 shadow-[0_0_18px_rgba(250,204,21,0.4)]"
                      : "text-slate-400 hover:text-yellow-300 hover:bg-yellow-500/5 hover:border-yellow-500/40"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Right side: wallet + mobile menu button */}
            <div className="flex items-center space-x-3">
              {/* Desktop wallet */}
              <div className="hidden sm:flex items-center">
                <MobileWalletConnector />
              </div>

              {/* Mobile wallet (inline with logo + hamburger) */}
              <div className="flex sm:hidden items-center">
                <MobileWalletConnector />
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-slate-400 hover:text-yellow-300 hover:bg-yellow-500/10 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-1 focus:ring-offset-black"
                aria-label="Toggle menu"
              >
                <div className="w-6 h-6 flex flex-col justify-center space-y-1">
                  <span
                    className={`block h-0.5 w-6 bg-current transform transition duration-300 ease-in-out ${
                      isMobileMenuOpen ? "rotate-45 translate-y-1.5" : ""
                    }`}
                  />
                  <span
                    className={`block h-0.5 w-6 bg-current transition duration-300 ease-in-out ${
                      isMobileMenuOpen ? "opacity-0" : "opacity-100"
                    }`}
                  />
                  <span
                    className={`block h-0.5 w-6 bg-current transform transition duration-300 ease-in-out ${
                      isMobileMenuOpen ? "-rotate-45 -translate-y-1.5" : ""
                    }`}
                  />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-black/95 border-t border-yellow-500/20 shadow-[0_8px_24px_rgba(0,0,0,0.9)]">
            <nav className="container mx-auto px-4 py-2">
              <div className="space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-3 px-3 py-4 rounded-xl text-base font-medium transition-all border border-transparent ${
                      item.current
                        ? "bg-yellow-500/10 text-yellow-300 border-yellow-400/60"
                        : "text-slate-300 hover:text-yellow-300 hover:bg-yellow-500/5 hover:border-yellow-500/40"
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.name}</span>
                    {item.current && (
                      <span className="ml-auto w-2 h-2 bg-yellow-400 rounded-full" />
                    )}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Bottom Navigation Bar for Mobile (App-like) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black/90 border-t border-yellow-500/20 shadow-[0_-8px_30px_rgba(0,0,0,0.9)] z-40 safe-area-inset-bottom">
        <div className="flex justify-around items-center">
          {navigation.slice(0, 4).map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center py-3 px-2 flex-1 min-w-0 relative transition-colors ${
                item.current
                  ? "text-yellow-300"
                  : "text-slate-400 hover:text-yellow-300"
              }`}
            >
              <span className="text-xl mb-1">{item.icon}</span>
              <span className="text-xs font-medium truncate max-w-full">
                {item.name}
              </span>
              {item.current && (
                <span className="absolute top-1 w-1.5 h-1.5 bg-yellow-400 rounded-full" />
              )}
            </Link>
          ))}

          {/* More menu item */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`flex flex-col items-center py-3 px-2 flex-1 min-w-0 relative transition-colors ${
              isMobileMenuOpen
                ? "text-yellow-300"
                : "text-slate-400 hover:text-yellow-300"
            }`}
          >
            <span className="text-xl mb-1">⋯</span>
            <span className="text-xs font-medium">More</span>
            {isMobileMenuOpen && (
              <span className="absolute top-1 w-1.5 h-1.5 bg-yellow-400 rounded-full" />
            )}
          </button>
        </div>
      </nav>

      {/* Add padding to main content for bottom nav */}
      <style jsx global>{`
        @media (max-width: 768px) {
          body {
            padding-bottom: 64px;
          }
        }
      `}</style>
    </>
  );
};
