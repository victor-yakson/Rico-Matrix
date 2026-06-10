"use client";

import { useTranslations } from "next-intl";

const whitepaperUrl = "https://rico-matrix.gitbook.io/whitepaper";

export default function SiteFooter() {
  const t = useTranslations("LandingPage.footer");
  const h = useTranslations("Header.socials");
  const year = new Date().getFullYear();

  const primaryLinks = [
    { label: t("links.whitepaper"), href: whitepaperUrl },
    { label: t("links.telegram"), href: "https://t.me/ricomatrixdapp" },
    { label: t("links.twitter"), href: "https://x.com/ricomatrixdapp" },
    { label: t("links.youtube"), href: "https://www.youtube.com/@ricomatrix" },
  ];

  return (
    <footer className="mt-12 border-t border-white/8 bg-[radial-gradient(circle_at_top,rgba(245,166,35,0.08),transparent_32%),linear-gradient(180deg,rgba(7,9,14,0.98),rgba(3,5,9,1))]">
      <div className="theme-container px-4 py-8 md:py-10">
        <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <span className="inline-flex rounded-full border border-yellow-400/25 bg-yellow-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-yellow-200/85">
                RicoMatrix
              </span>
              <h3 className="mt-4 text-xl font-semibold text-slate-50 md:text-2xl">
                Read. Earn. Own.
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Premium Web3 learning, matrix growth, publishing, and token utility in one connected ecosystem.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 md:justify-end">
              {primaryLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:border-yellow-400/30 hover:bg-yellow-500/10 hover:text-yellow-100"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-white/8 pt-5 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
            <div>{t("copyright", { year })}</div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-slate-600">{h("connectWithUs")}</span>
              <a
                href="mailto:info@ricomatrix.com"
                className="transition hover:text-yellow-100"
              >
                Email
              </a>
              <span className="text-white/10">•</span>
              <a
                href="https://ricomatrix.com/"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-yellow-100"
              >
                {t("links.website")}
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
