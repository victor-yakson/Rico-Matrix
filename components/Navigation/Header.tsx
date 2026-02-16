"use client";

import { ConnectWallet } from "../Common/ConnectWallet";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import { LanguageSwitcher } from "../Common/LanguageSwitcher";
import { useTranslations } from "next-intl";

export const Header = () => {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const t = useTranslations("Header");

  useEffect(() => {
    setMounted(true);
  }, []);

  const navigation = [
    {
      name: t("navigation.dashboard"),
      href: "/",
      current: pathname === "/",
      icon: "🏠",
    },
    {
      name: t("navigation.authors"),
      href: "/authors",
      current: pathname === "/authors",
      icon: "✍️",
    },
    {
      name: t("navigation.chapters"),
      href: "/chapters",
      current: pathname === "/chapters",
      icon: "📚",
    },
    {
      name: t("navigation.matrix"),
      href: "/matrix",
      current: pathname === "/matrix",
      icon: "🔗",
    },
    {
      name: t("navigation.royalty"),
      href: "/royalty",
      current: pathname === "/royalty",
      icon: "💰",
    },
    // {
    //   name: t("navigation.profile"),
    //   href: "/profile",
    //   current: pathname === "/profile",
    //   icon: "👤",
    // },
    {
      name: t("navigation.documentation"),
      href: "/documentation",
      current: pathname === "/documentation",
      icon: "📄",
    },
  ];

  const socialLinks = [
    {
      name: "Email",
      href: "mailto:info@ricomatrix.com",
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
        </svg>
      ),
      color: "text-red-400",
      bgColor: "bg-red-500/10",
    },
    {
      name: "Telegram",
      href: "https://t.me/ricomatrixdapp",
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.064-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      ),
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      name: "X",
      href: "https://x.com/ricomatrixdapp",
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      color: "text-gray-800 dark:text-gray-300",
      bgColor: "bg-gray-500/10",
    },
    {
      name: "YouTube",
      href: "https://www.youtube.com/@ricomatrix",
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
        </svg>
      ),
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      name: "TikTok",
      href: "https://tiktok.com/@ricomatrix",
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
      ),
      color: "text-black dark:text-gray-300",
      bgColor: "bg-gray-500/10",
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
              <div className="relative ">
                <Image
                  src="/logo.png"
                  alt={t("logo.alt")}
                  width={40}
                  height={40}
                  className="object-contain"
                  priority
                />
              </div>
              {/* <span className="text-xl font-bold text-slate-50 hidden sm:block tracking-wide">
                {t('logo.text')}
              </span> */}
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-2 lg:space-x-4 flex-wrap">
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

            {/* Right side: language + wallet + mobile menu button */}
            <div className="flex items-center space-x-3">
              {/* Desktop language switcher */}
              <div className="hidden md:flex">
                <LanguageSwitcher />
              </div>

              {/* Desktop wallet */}
              <div className="hidden sm:flex items-center">
                <ConnectWallet />
              </div>

              {/* Mobile wallet (inline with logo + hamburger) */}
              <div className="flex sm:hidden items-center">
                <ConnectWallet />
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-slate-400 hover:text-yellow-300 hover:bg-yellow-500/10 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-1 focus:ring-offset-black"
                aria-label={t("mobile.menuButton")}
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
            <nav className="container mx-auto px-4 py-2 space-y-3">
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

              {/* Mobile Social Links */}
              <div className="pt-4 pb-2 border-t border-yellow-500/20">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-3 px-3">
                  {t("socials.connectWithUs")}
                </p>
                <div className="grid grid-cols-5 gap-2 px-3">
                  {socialLinks.map((social) => (
                    <a
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex flex-col items-center p-3 rounded-xl ${social.bgColor} transition-all hover:scale-105`}
                      aria-label={social.name}
                    >
                      <div className={`${social.color} mb-1`}>
                        {social.icon}
                      </div>
                      <span className="text-xs text-slate-400">
                        {social.name}
                      </span>
                    </a>
                  ))}
                </div>
                <div className="mt-3 px-3">
                  <a
                    href="mailto:info@ricomatrix.com"
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-slate-100 transition-colors text-sm"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                    </svg>
                    info@ricomatrix.com
                  </a>
                </div>
              </div>

              {/* Mobile language switcher */}
              <div className="pt-2 border-t border-yellow-500/20">
                <LanguageSwitcher />
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
            <span className="text-xs font-medium">{t("mobile.more")}</span>
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
