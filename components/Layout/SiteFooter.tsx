"use client";

import { useTranslations } from "next-intl";

export default function SiteFooter() {
  const t = useTranslations("LandingPage.footer");
  const h = useTranslations("Header.socials");
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>{t("copyright", { year })}</div>
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
        </div>
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
        </div>
      </div>
    </footer>
  );
}
