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
      icon: "⌂",
    },
    {
      name: t("navigation.chapters"),
      href: "/chapters",
      current: pathname === "/chapters",
      icon: "▤",
    },
    {
      name: t("navigation.rico"),
      href: "/rico",
      current: pathname === "/rico",
      icon: "◎",
    },
    {
      name: t("navigation.voting"),
      href: "/voting",
      current: pathname === "/voting",
      icon: "✦",
    },
    {
      name: t("navigation.authors"),
      href: "/library",
      current: pathname?.startsWith("/library"),
      icon: "◫",
    },
    {
      name: t("navigation.skills"),
      href: "/skills",
      current: pathname === "/skills",
      icon: "◈",
    },
    {
      name: t("navigation.matrix"),
      href: "/matrix",
      current: pathname === "/matrix",
      icon: "◉",
    },
    {
      name: t("navigation.royalty"),
      href: "/royalty",
      current: pathname === "/royalty",
      icon: "◌",
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
      icon: "≣",
    },
  ];

  const socialLinks = [
    { name: "Telegram", href: "https://t.me/ricomatrixdapp" },
    { name: "X", href: "https://x.com/rmdapp" },
    { name: "YouTube", href: "https://www.youtube.com/@ricomatrix" },
    { name: "TikTok", href: "https://tiktok.com/@ricomatrix" },
  ];

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Skeleton while mounting (avoids hydration mismatches)
  if (!mounted) {
    return (
      <header className="site-header">
        <div className="theme-container px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="h-10 w-10 rounded-2xl border border-white/8 bg-white/6 animate-pulse" />
              <span className="text-xl font-semibold text-slate-100 hidden sm:block">
                RICO MATRIX
              </span>
              <span className="text-xl font-semibold text-slate-100 sm:hidden">
                RM
              </span>
            </div>
            <div className="h-10 w-32 rounded-2xl border border-white/8 bg-white/6 animate-pulse" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="site-header">
        <div className="theme-container px-4">
          <div className="flex min-h-16 items-center justify-between gap-2 py-2 md:gap-3">
            <Link
              href="/"
              className="group flex min-w-0 flex-shrink items-center gap-3"
            >
              <div className="relative overflow-hidden rounded-2xl border border-[rgba(241,210,133,0.22)] bg-[linear-gradient(135deg,rgba(241,210,133,0.1),rgba(66,137,255,0.16))] p-2 shadow-[0_14px_34px_rgba(0,0,0,0.32)] transition-transform duration-200 group-hover:-translate-y-0.5">
                <Image
                  src="/logo.png"
                  alt={t("logo.alt")}
                  width={34}
                  height={34}
                  className="object-contain"
                  priority
                />
              </div>
              <div className="hidden sm:block">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[rgba(241,210,133,0.78)]">
                  RicoMatrix
                </p>
                <p className="text-sm text-slate-200/90">
                  Read. Earn. Own.
                </p>
              </div>
            </Link>

            <nav className="hidden xl:flex items-center rounded-full border border-white/8 bg-[rgba(7,10,17,0.78)] px-2 py-1.5 shadow-[0_18px_44px_rgba(0,0,0,0.28)] backdrop-blur-xl">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all whitespace-nowrap border ${
                    item.current
                      ? "border-[rgba(241,210,133,0.3)] bg-[linear-gradient(135deg,rgba(241,210,133,0.14),rgba(66,137,255,0.18))] text-white shadow-[0_10px_24px_rgba(0,0,0,0.24)]"
                      : "border-transparent text-slate-400 hover:border-[rgba(107,184,255,0.2)] hover:bg-white/4 hover:text-[var(--primary)]"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-2 md:gap-3">
              <div className="flex lg:hidden items-center">
                <LanguageSwitcher />
              </div>

              <div className="hidden lg:flex">
                <LanguageSwitcher />
              </div>

                <div className="hidden sm:flex items-center">
                <ConnectWallet />
              </div>  

              <div className="flex sm:hidden items-center">
                <ConnectWallet />
              </div>

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="hidden lg:flex xl:hidden h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/4 text-slate-300 transition hover:border-[rgba(241,210,133,0.3)] hover:text-[var(--primary)]"
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
          <div className="xl:hidden border-t border-white/8 bg-[rgba(4,6,11,0.95)] shadow-[0_18px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <nav className="theme-container max-h-[calc(100vh-9.5rem)] overflow-y-auto px-4 py-3 space-y-3 overscroll-contain">
              <div className="space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-4 py-3.5 rounded-2xl text-base font-medium transition-all border ${
                      item.current
                        ? "border-[rgba(241,210,133,0.34)] bg-[linear-gradient(135deg,rgba(241,210,133,0.12),rgba(66,137,255,0.18))] text-white"
                        : "border-white/6 text-slate-300 hover:border-[rgba(107,184,255,0.24)] hover:bg-white/4 hover:text-[var(--primary)]"
                    }`}
                  >
                    <span>{item.name}</span>
                    {item.current && (
                      <span className="ml-auto h-2 w-2 rounded-full bg-[var(--primary)]" />
                    )}
                  </Link>
                ))}
              </div>

              <div className="border-t border-white/8 px-1 pt-4 pb-2">
                <p className="mb-3 px-3 text-xs uppercase tracking-[0.26em] text-slate-500">
                  {t("socials.connectWithUs")}
                </p>
                <div className="grid grid-cols-2 gap-2 px-3 sm:grid-cols-4">
                  {socialLinks.map((social) => (
                    <a
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-2xl border border-white/8 bg-white/4 px-3 py-3 text-sm text-slate-300 transition hover:border-[rgba(107,184,255,0.24)] hover:text-[var(--primary)]"
                      aria-label={social.name}
                    >
                      {social.name}
                    </a>
                  ))}
                </div>
                <div className="mt-3 px-3">
                  <a
                    href="mailto:info@ricomatrix.com"
                    className="flex items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/4 p-3 text-sm text-slate-300 transition hover:border-[rgba(241,210,133,0.24)] hover:text-[var(--primary)]"
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

            </nav>
          </div>
        )}
      </header>

      {/* Bottom Navigation Bar for Mobile (App-like) */}
      <nav className="safe-area-inset-bottom fixed bottom-0 left-0 right-0 z-40 border-t border-white/8 bg-[rgba(5,7,12,0.94)] shadow-[0_-12px_36px_rgba(0,0,0,0.5)] backdrop-blur-xl lg:hidden">
        <div className="flex justify-around items-center">
          {navigation.slice(0, 4).map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center py-3 px-2 flex-1 min-w-0 relative transition-colors ${
                item.current
                  ? "text-[var(--primary)]"
                  : "text-slate-400 hover:text-[var(--primary)]"
              }`}
            >
              <span className="mb-1 text-xl">{item.icon}</span>
              <span className="text-xs font-medium truncate max-w-full">
                {item.name}
              </span>
              {item.current && (
                <span className="absolute top-1 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              )}
            </Link>
          ))}

          {/* More menu item */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`flex flex-col items-center py-3 px-2 flex-1 min-w-0 relative transition-colors ${
              isMobileMenuOpen
                ? "text-[var(--primary)]"
                : "text-slate-400 hover:text-[var(--primary)]"
            }`}
          >
            <span className="text-xl mb-1">⋯</span>
            <span className="text-xs font-medium">{t("mobile.more")}</span>
            {isMobileMenuOpen && (
              <span className="absolute top-1 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            )}
          </button>
        </div>
      </nav>

      {/* Add padding to main content for bottom nav */}
      <style jsx global>{`
        @media (max-width: 1024px) {
          body {
            padding-bottom: 64px;
          }
        }
      `}</style>
    </>
  );
};
