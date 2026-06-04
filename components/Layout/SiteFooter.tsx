"use client";

import { useTranslations } from "next-intl";

export default function SiteFooter() {
  const t = useTranslations("LandingPage.footer");
  const h = useTranslations("Header.socials");
  const year = new Date().getFullYear();
  const whitepaperUrl = "https://rico-matrix.gitbook.io/whitepaper";

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="flex flex-wrap items-center gap-3">
          <span className="theme-chip theme-chip--gold">RicoMatrix</span>
          <div>{t("copyright", { year })}</div>
        </div>
        <div className="footer-links hidden md:flex">
          <a href="https://ricomatrix.com/" target="_blank" rel="noreferrer">
            {t("links.website")}
          </a>
          <a href="https://t.me/ricomatrixdapp" target="_blank" rel="noreferrer">
            {t("links.telegram")}
          </a>
          <a href="https://x.com/ricomatrixdapp" target="_blank" rel="noreferrer">
            {t("links.twitter")}
          </a>
          <a
            href="https://www.youtube.com/@ricomatrix"
            target="_blank"
            rel="noreferrer"
          >
            {t("links.youtube")}
          </a>
          <a href={whitepaperUrl} target="_blank" rel="noreferrer">
            {t("links.whitepaper")}
          </a>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 md:hidden">
        <a
          href="https://ricomatrix.com/"
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-center text-sm text-slate-300 transition hover:border-[rgba(241,210,133,0.24)] hover:text-[var(--primary)]"
        >
          {t("links.website")}
        </a>
        <a
          href={whitepaperUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-center text-sm text-slate-300 transition hover:border-[rgba(241,210,133,0.24)] hover:text-[var(--primary)]"
        >
          {t("links.whitepaper")}
        </a>
        <a
          href="https://t.me/ricomatrixdapp"
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-center text-sm text-slate-300 transition hover:border-[rgba(241,210,133,0.24)] hover:text-[var(--primary)]"
        >
          {t("links.telegram")}
        </a>
        <a
          href="https://x.com/ricomatrixdapp"
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-center text-sm text-slate-300 transition hover:border-[rgba(241,210,133,0.24)] hover:text-[var(--primary)]"
        >
          {t("links.twitter")}
        </a>
      </div>

      <div className="footer-connect hidden md:flex">
        <div className="footer-connect-title">{h("connectWithUs")}</div>
        <div className="footer-connect-links">
          <a href="mailto:info@ricomatrix.com">Email</a>
          <a href="https://t.me/ricomatrixdapp" target="_blank" rel="noreferrer">
            Telegram
          </a>
          <a href="https://x.com/ricomatrixdapp" target="_blank" rel="noreferrer">
            X
          </a>
          <a
            href="https://www.youtube.com/@ricomatrix"
            target="_blank"
            rel="noreferrer"
          >
            YouTube
          </a>
          <a href={whitepaperUrl} target="_blank" rel="noreferrer">
            {t("links.whitepaper")}
          </a>
        </div>
      </div>
    </footer>
  );
}
