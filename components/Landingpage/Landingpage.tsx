"use client";

import React, { useEffect, useState, MouseEvent, useMemo, memo } from "react";
import MobileWalletConnector from "../Common/MobileWalletConnector";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { LanguageSwitcher } from "../Common/LanguageSwitcher";

type Countdown = {
  days: string;
  hours: string;
  mins: string;
  secs: string;
};

const LAUNCH_TARGET = new Date("2025-12-15T15:00:00Z").getTime();

const initialCountdown: Countdown = {
  days: "--",
  hours: "--",
  mins: "--",
  secs: "--",
};

// Memoized MobileWalletConnector to prevent unnecessary re-renders
const MemoizedMobileWalletConnector = memo(MobileWalletConnector);

// FAQ items with translation keys
const faqKeys = [
  "questions.0",
  "questions.1",
  "questions.2",
  "questions.3",
  "questions.4",
];

const RicoMatrixFaqItem: React.FC<{
  question: string;
  answer: React.ReactNode;
}> = ({ question, answer }) => {
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    setOpen((prev) => !prev);
  };

  return (
    <article className={`faq-item reveal ${open ? "faq-item--open" : ""}`}>
      <div className="faq-header" onClick={handleClick}>
        <div className="faq-question">{question}</div>
        <div className="faq-toggle">{open ? "–" : "+"}</div>
      </div>
      <div className="faq-body">{answer}</div>
    </article>
  );
};

// Separate Countdown Component to isolate re-renders
const CountdownDisplay: React.FC = () => {
  const t = useTranslations("LandingPage.launchInfo.countdown");
  const [countdown, setCountdown] = useState<Countdown>(initialCountdown);

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      let diff = Math.max(0, LAUNCH_TARGET - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      diff -= days * 1000 * 60 * 60 * 24;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      diff -= hours * 1000 * 60 * 60;
      const mins = Math.floor(diff / (1000 * 60));
      diff -= mins * 1000 * 60;
      const secs = Math.floor(diff / 1000);

      setCountdown({
        days: String(days).padStart(2, "0"),
        hours: String(hours).padStart(2, "0"),
        mins: String(mins).padStart(2, "0"),
        secs: String(secs).padStart(2, "0"),
      });
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="hero-countdown">
      <div className="countdown-label">{t("label")}</div>
      <div className="countdown-grid" id="countdown">
        <div className="countdown-item">
          <div className="countdown-value" id="cd-days">
            {countdown.days}
          </div>
          <div className="countdown-label-small">{t("days")}</div>
        </div>
        <div className="countdown-item">
          <div className="countdown-value" id="cd-hours">
            {countdown.hours}
          </div>
          <div className="countdown-label-small">{t("hours")}</div>
        </div>
        <div className="countdown-item">
          <div className="countdown-value" id="cd-mins">
            {countdown.mins}
          </div>
          <div className="countdown-label-small">{t("mins")}</div>
        </div>
        <div className="countdown-item">
          <div className="countdown-value" id="cd-secs">
            {countdown.secs}
          </div>
          <div className="countdown-label-small">{t("secs")}</div>
        </div>
      </div>
      <div className="launch-note">{t("note")}</div>
    </div>
  );
};

const RicoMatrixLandingPage: React.FC = () => {
  const t = useTranslations("LandingPage");
  const locale = useLocale();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Helper function to render HTML from translation
  const renderHTML = (html: string) => {
    return { __html: html };
  };

  // Scroll reveal animation
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined")
      return;

    const elements = document.querySelectorAll<HTMLElement>(".reveal");

    if (!("IntersectionObserver" in window)) {
      elements.forEach((el) => el.classList.add("reveal--visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal--visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const handleNavClick = (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    scrollToId(id);
    setMobileNavOpen(false);
  };

  const scrollToId = (id: string) => {
    if (typeof document === "undefined") return;
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const year = new Date().getFullYear();
  const heroTitle = t.rich("title", {
    highlight: (chunks) => <span className="hero-highlight">{chunks}</span>,
  });

  const heroSubtitle = t.rich("subtitle", {
    strong: (chunks) => <strong>{chunks}</strong>,
  });

  return (
    <div className="page" id="top">
      {/* Header */}

      <header className="site-header">
        <div className="site-header-inner">
          <button
            type="button"
            className="logo"
            onClick={() => scrollToId("top")}
            aria-label="Scroll to top"
          >
            <div className="logo-mark" aria-hidden="true">
              <img src="/logo.png" alt="RICO MATRIX" className="logo-img" />
            </div>
          </button>

          <nav className="nav">
            <div className="nav-links" id="nav-links-desktop">
              <a href="#how" onClick={handleNavClick("how")}>
                {t("nav.howItWorks")}
              </a>
              <a href="#videos" onClick={handleNavClick("videos")}>
                {t("nav.videos")}
              </a>
              <a href="#levels" onClick={handleNavClick("levels")}>
                {t("nav.levels")}
              </a>
              <a href="#faq" onClick={handleNavClick("faq")}>
                {t("nav.faq")}
              </a>
            </div>

            {/* ✅ Right-side group: language + CTA + burger */}
            <div className="nav-actions">
              <div className="language-switcher">
                <LanguageSwitcher />
              </div>

              <button
                className="nav-cta"
                type="button"
                onClick={() => scrollToId("cta")}
              >
                <span>{t("activateLevel")}</span>
              </button>

              <button
                className={`burger ${mobileNavOpen ? "burger--open" : ""}`}
                id="burger"
                aria-label="Toggle navigation"
                type="button"
                onClick={() => setMobileNavOpen((prev) => !prev)}
              >
                <span></span>
                <span></span>
                <span></span>
              </button>
            </div>
          </nav>
        </div>

        {mobileNavOpen && (
          <div className="nav-links nav-links--mobile">
            <a href="#how" onClick={handleNavClick("how")}>
              {t("nav.howItWorks")}
            </a>
            <a href="#videos" onClick={handleNavClick("videos")}>
              {t("nav.videos")}
            </a>
            <a href="#levels" onClick={handleNavClick("levels")}>
              {t("nav.levels")}
            </a>
            <a href="#faq" onClick={handleNavClick("faq")}>
              {t("nav.faq")}
            </a>
            <a href="#cta" onClick={handleNavClick("cta")}>
              {t("activateLevel")}
            </a>

            {/* 🌐 Mobile-only language switcher at bottom of menu */}
            <div className="nav-mobile-language">
              <div className="language-switcher language-switcher--mobile">
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* HERO BLOCK */}
        <section className="hero hero--fullscreen">
          <div className="container">
            <div className="hero-full">
              <div className="hero-banner reveal">
                <div className="hero-banner-inner">
                  <h1
                    className="hero-title"
                    dangerouslySetInnerHTML={renderHTML(t("title"))}
                  />

                  <p
                    className="hero-subtitle"
                    dangerouslySetInnerHTML={renderHTML(t("subtitle"))}
                  />

                  <div className="hero-ctas mt-6 flex flex-col sm:flex-row items-center md:items-start gap-4 sm:gap-6 lg:gap-8">
                    <MemoizedMobileWalletConnector />

                    <a
                      href="https://t.me/ricomatrixdapp"
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary flex items-center justify-center h-14 px-8 text-lg rounded-xl"
                    >
                      {t("joinTelegram")}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MATRIX OVERVIEW BLOCK */}
        <section id="matrix-overview" className="section section--tight">
          <div className="container">
            <div className="hero-visual-wrapper reveal">
              <div className="hero-card">
                <div className="hero-card-glow"></div>

                <div className="hero-card-header">
                  <div>
                    <div className="hero-card-title">
                      {t("matrixOverview.title")}
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {t("matrixOverview.subtitle")}
                    </div>
                  </div>
                  <div className="hero-card-chip">
                    {t("matrixOverview.blockchain")}
                  </div>
                </div>

                <div className="hero-card-main">
                  <div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-muted)",
                        marginBottom: 6,
                      }}
                    >
                      {t("matrixOverview.note")}
                    </div>
                    <div className="hero-card-matrix">
                      <div className="hero-card-level">
                        <div>{t("matrixOverview.chapters.chapter1")}</div>
                        <span>$5</span>
                        <small>{t("matrixOverview.prices.entry")}</small>
                      </div>
                      <div className="hero-card-level">
                        <div>{t("matrixOverview.chapters.chapter4")}</div>
                        <span>$40</span>
                        <small>{t("matrixOverview.prices.teamBuilder")}</small>
                      </div>
                      <div className="hero-card-level hero-card-level--highlight">
                        <div>{t("matrixOverview.chapters.chapter9")}</div>
                        <span>$1280</span>
                        <small>
                          {t("matrixOverview.prices.globalSpillover")}
                        </small>
                      </div>
                      <div className="hero-card-level">
                        <div>{t("matrixOverview.chapters.chapter10")}</div>
                        <span>$2560</span>
                        <small>{t("matrixOverview.prices.scaling")}</small>
                      </div>
                      <div className="hero-card-level">
                        <div>{t("matrixOverview.chapters.chapter11")}</div>
                        <span>$5120</span>
                        <small>{t("matrixOverview.prices.leaders")}</small>
                      </div>
                      <div className="hero-card-level">
                        <div>{t("matrixOverview.chapters.chapter12")}</div>
                        <span>$10240</span>
                        <small>{t("matrixOverview.prices.whales")}</small>
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: "0.78rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      All active chapters work in parallel and never expire.
                      Each auto-recycle reopens the chapter for more earnings.
                    </div>
                  </div>

                  <div>
                    <div className="hero-card-rocket">
                      <div className="rocket">
                        <div className="rocket-fin rocket-fin--left"></div>
                        <div className="rocket-fin rocket-fin--right"></div>
                        <div className="rocket-fire"></div>
                        <div className="rocket-smoke"></div>
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: "0.78rem",
                        color: "var(--text-muted)",
                        marginTop: 8,
                        textAlign: "center",
                      }}
                    >
                      Switch on your <strong>RICO Engine</strong> once and let
                      the smart contract work 24/7.
                    </div>
                  </div>
                </div>

                <div className="hero-card-footer">
                  <div
                    dangerouslySetInnerHTML={renderHTML(
                      t("matrixOverview.footer.royalty")
                    )}
                  />
                  <div
                    dangerouslySetInnerHTML={renderHTML(
                      t("matrixOverview.footer.farming")
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LAUNCH INFO */}
        <section className="section section--tight launch-info">
          <div className="container">
            <div className="block-panel reveal">
              <div className="launch-grid">
                <div>
                  <div className="hero-kicker">
                    <span className="hero-kicker-pill">
                      {t("launchInfo.launching")}
                    </span>
                    <span>{t("launchInfo.time")}</span>
                  </div>

                  <div className="hero-badges">
                    <div className="hero-badge">
                      <span className="hero-badge-dot"></span>
                      {t("launchInfo.badges.decentralized")}
                    </div>
                    <div className="hero-badge">
                      <span className="hero-badge-dot"></span>
                      {t("launchInfo.badges.earnings")}
                    </div>
                    <div className="hero-badge">
                      <span className="hero-badge-dot"></span>
                      {t("launchInfo.badges.royalty")}
                    </div>
                  </div>

                  <div className="hero-meta">
                    <div
                      className="hero-meta-pill"
                      dangerouslySetInnerHTML={renderHTML(
                        t("launchInfo.recommendation")
                      )}
                    />
                    <div
                      dangerouslySetInnerHTML={renderHTML(
                        t("launchInfo.partners")
                      )}
                    />
                  </div>
                </div>

                <div>
                  <CountdownDisplay />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* X3 IMAGE */}
        <section className="section section--tight">
          <div className="container">
            <div className="block-panel image-block reveal">
              <div className="section-head">
                <div className="section-kicker">{t("visuals.x3.kicker")}</div>
                <h2 className="section-title">{t("visuals.x3.title")}</h2>
                <p className="section-subtitle">{t("visuals.x3.subtitle")}</p>
              </div>
              <div className="image-frame">
                <img
                  src="/ricox3matrixs.png"
                  alt="RICO MATRIX X3 matrix visual"
                />
              </div>
              <div className="image-note">{t("visuals.x3.note")}</div>
            </div>
          </div>
        </section>

        {/* WHY PEOPLE ARE JOINING */}
        <section className="section section--tight">
          <div className="container">
            <div className="block-panel">
              <div className="section-head reveal">
                <div className="section-kicker">{t("whyJoin.kicker")}</div>
                <h2 className="section-title">{t("whyJoin.title")}</h2>
                <p className="section-subtitle">{t("whyJoin.subtitle")}</p>
              </div>

              <div className="grid grid--3">
                <article className="card reveal">
                  <div className="card-kicker">
                    {t("whyJoin.features.spillovers.kicker")}
                  </div>
                  <h3 className="card-title">
                    {t("whyJoin.features.spillovers.title")}
                  </h3>
                  <p className="card-body">
                    {t("whyJoin.features.spillovers.description")}
                  </p>
                </article>

                <article className="card reveal">
                  <div className="card-kicker">
                    {t("whyJoin.features.ip.kicker")}
                  </div>
                  <h3 className="card-title">
                    {t("whyJoin.features.ip.title")}
                  </h3>
                  <p className="card-body">
                    {t("whyJoin.features.ip.description")}
                  </p>
                </article>

                <article className="card reveal">
                  <div className="card-kicker">
                    {t("whyJoin.features.royalty.kicker")}
                  </div>
                  <h3 className="card-title">
                    {t("whyJoin.features.royalty.title")}
                  </h3>
                  <p className="card-body">
                    {t("whyJoin.features.royalty.description")}
                  </p>
                </article>
              </div>
            </div>
          </div>
        </section>

        {/* X6 IMAGE */}
        <section className="section section--tight">
          <div className="container">
            <div className="block-panel image-block reveal">
              <div className="section-head">
                <div className="section-kicker">{t("visuals.x6.kicker")}</div>
                <h2 className="section-title">{t("visuals.x6.title")}</h2>
              </div>
              <div className="image-frame">
                <img
                  src="/ricox6matrix.png"
                  alt="RICO MATRIX X6 matrix visual"
                />
              </div>
              <div className="image-note">{t("visuals.x6.note")}</div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="section">
          <div className="container">
            <div className="block-panel">
              <div className="section-head reveal">
                <div className="section-kicker">{t("howItWorks.kicker")}</div>
                <h2 className="section-title">{t("howItWorks.title")}</h2>
                <p className="section-subtitle">{t("howItWorks.subtitle")}</p>
              </div>

              <div className="steps">
                <article className="step reveal">
                  <div className="step-index">
                    {t("howItWorks.steps.step1.index")}
                  </div>
                  <div>
                    <h3 className="step-title">
                      {t("howItWorks.steps.step1.title")}
                    </h3>
                    <p
                      className="step-body"
                      dangerouslySetInnerHTML={renderHTML(
                        t("howItWorks.steps.step1.description")
                      )}
                    />
                  </div>
                </article>

                <article className="step reveal">
                  <div className="step-index">
                    {t("howItWorks.steps.step2.index")}
                  </div>
                  <div>
                    <h3 className="step-title">
                      {t("howItWorks.steps.step2.title")}
                    </h3>
                    <p
                      className="step-body"
                      dangerouslySetInnerHTML={renderHTML(
                        t("howItWorks.steps.step2.description")
                      )}
                    />
                  </div>
                </article>

                <article className="step reveal">
                  <div className="step-index">
                    {t("howItWorks.steps.step3.index")}
                  </div>
                  <div>
                    <h3 className="step-title">
                      {t("howItWorks.steps.step3.title")}
                    </h3>
                    <p
                      className="step-body"
                      dangerouslySetInnerHTML={renderHTML(
                        t("howItWorks.steps.step3.description")
                      )}
                    />
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        {/* VIDEOS */}
        <section id="videos" className="section section--tight">
          <div className="container">
            <div className="block-panel">
              <div className="section-head reveal">
                <div className="section-kicker">{t("videos.kicker")}</div>
                <h2 className="section-title">{t("videos.title")}</h2>
                <p className="section-subtitle">{t("videos.subtitle")}</p>
              </div>

              <div className="video-grid">
                <article className="video-card reveal">
                  <h3 className="video-title">
                    {t("videos.tutorials.tutorial1.title")}
                  </h3>
                  <p className="video-desc">
                    {t("videos.tutorials.tutorial1.description")}
                  </p>
                  <div className="video-embed">
                    <iframe
                      src="https://www.youtube.com/embed/V0WrNFZlehg"
                      allowFullScreen
                      loading="lazy"
                      title={t("videos.tutorials.tutorial1.title")}
                    />
                  </div>
                </article>

                <article className="video-card reveal">
                  <h3 className="video-title">
                    {t("videos.tutorials.tutorial2.title")}
                  </h3>
                  <p className="video-desc">
                    {t("videos.tutorials.tutorial2.description")}
                  </p>
                  <div className="video-embed">
                    <iframe
                      src="https://www.youtube.com/embed/gqHHsPycihI"
                      allowFullScreen
                      loading="lazy"
                      title={t("videos.tutorials.tutorial2.title")}
                    />
                  </div>
                </article>

                <article className="video-card reveal">
                  <h3 className="video-title">
                    {t("videos.tutorials.tutorial3.title")}
                  </h3>
                  <p className="video-desc">
                    {t("videos.tutorials.tutorial3.description")}
                  </p>
                  <div className="video-embed">
                    <iframe
                      src="https://www.youtube.com/embed/ZhBtH28m3es"
                      allowFullScreen
                      loading="lazy"
                      title={t("videos.tutorials.tutorial3.title")}
                    />
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        {/* STRATEGIC PARTNERS */}
        <section className="section section--tight">
          <div className="container">
            <div className="block-panel reveal">
              <div className="section-head">
                <div className="section-kicker">{t("partners.kicker")}</div>
                <h2 className="section-title">{t("partners.title")}</h2>
                <p className="section-subtitle">{t("partners.subtitle")}</p>
              </div>

              <div className="partners-grid">
                <div className="partner-logo">
                  <img
                    src="https://cryptologos.cc/logos/tether-usdt-logo.svg?v=040"
                    alt="USDT Tether logo"
                  />
                </div>
                <div className="partner-logo">
                  <img
                    src="https://cryptologos.cc/logos/bnb-bnb-logo.svg?v=040"
                    alt="BNB logo"
                  />
                </div>
                <div className="partner-logo">
                  <img
                    src="https://cryptologos.cc/logos/alchemy-pay-ach-logo.svg?v=040"
                    alt="Alchemy logo"
                  />
                </div>
                <div className="partner-logo">
                  <img
                    src="/Trust_Core Logo_Blue.svg"
                    alt="Trust Wallet logo"
                  />
                </div>
                <div className="partner-logo">
                  <img
                    src="https://cryptologos.cc/logos/safepal-sfp-logo.svg?v=040"
                    alt="SafePal logo"
                  />
                </div>
                <div className="partner-logo">
                  <img src="/remix.webp" alt="Remix logo" />
                </div>
                <div className="partner-logo">
                  <img
                    src="https://images.ctfassets.net/clixtyxoaeas/4rnpEzy1ATWRKVBOLxZ1Fm/a74dc1eed36d23d7ea6030383a4d5163/MetaMask-icon-fox.svg"
                    alt="MetaMask logo"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* UNILEVEL IMAGE */}
        <section className="section section--tight">
          <div className="container">
            <div className="block-panel image-block reveal">
              <div className="section-head">
                <div className="section-kicker">{t("unilevel.kicker")}</div>
                <h2 className="section-title">{t("unilevel.title")}</h2>
                <p className="section-subtitle">{t("unilevel.subtitle")}</p>
              </div>
              <div className="image-frame">
                <img
                  src="/12unilevelrico.jpg"
                  alt="12-level unilevel earning ladder"
                />
              </div>
            </div>
          </div>
        </section>

        {/* LEVELS */}
        <section id="levels" className="section section--tight">
          <div className="container">
            <div className="block-panel">
              <div className="levels-wrap">
                <div className="levels-content reveal">
                  <div className="section-kicker">{t("levels.kicker")}</div>
                  <p className="section-subtitle">{t("levels.subtitle")}</p>

                  <div
                    className="levels-grid"
                    style={{
                      marginTop: 18,
                    }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((level) => (
                      <div
                        key={level}
                        className={`level-card ${
                          level === 9 ? "level-card--highlight" : ""
                        }`}
                      >
                        <div className="level-label">
                          {t(`levels.chapters.level${level}`)}
                        </div>
                        <div className="level-price">
                          {t(`levels.prices.level${level}`)}
                        </div>
                        <div className="level-meta">
                          {t(`levels.descriptions.level${level}`)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <p
                    className="levels-note"
                    style={{
                      marginTop: 14,
                    }}
                    dangerouslySetInnerHTML={renderHTML(t("levels.note"))}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* WHY RICO DIFFERENT + EXTRA VIDEO */}
        <section id="why" className="section section--tight">
          <div className="container">
            <div className="block-panel">
              <div className="grid grid--2">
                <div className="reveal">
                  <div className="section-kicker">
                    {t("whyDifferent.kicker")}
                  </div>

                  <div className="why-grid">
                    <article className="why-card">
                      <div className="why-tag">
                        {t("whyDifferent.features.decentralized.tag")}
                      </div>
                      <h3 className="why-title">
                        {t("whyDifferent.features.decentralized.title")}
                      </h3>
                      <p className="why-body">
                        {t("whyDifferent.features.decentralized.description")}
                      </p>
                    </article>

                    <article className="why-card">
                      <div className="why-tag">
                        {t("whyDifferent.features.dualTrack.tag")}
                      </div>
                      <h3 className="why-title">
                        {t("whyDifferent.features.dualTrack.title")}
                      </h3>
                      <p className="why-body">
                        {t("whyDifferent.features.dualTrack.description")}
                      </p>
                    </article>

                    <article className="why-card">
                      <div className="why-tag">
                        {t("whyDifferent.features.royalties.tag")}
                      </div>
                      <h3 className="why-title">
                        {t("whyDifferent.features.royalties.title")}
                      </h3>
                      <p className="why-body">
                        {t("whyDifferent.features.royalties.description")}
                      </p>
                    </article>

                    <article className="why-card">
                      <div className="why-tag">
                        {t("whyDifferent.features.unilevel.tag")}
                      </div>
                      <h3 className="why-title">
                        {t("whyDifferent.features.unilevel.title")}
                      </h3>
                      <p className="why-body">
                        {t("whyDifferent.features.unilevel.description")}
                      </p>
                    </article>

                    <article className="why-card">
                      <div className="why-tag">
                        {t("whyDifferent.features.coin.tag")}
                      </div>
                      <h3 className="why-title">
                        {t("whyDifferent.features.coin.title")}
                      </h3>
                      <p className="why-body">
                        {t("whyDifferent.features.coin.description")}
                      </p>
                    </article>

                    <article className="why-card">
                      <div className="why-tag">
                        {t("whyDifferent.features.ip.tag")}
                      </div>
                      <h3 className="why-title">
                        {t("whyDifferent.features.ip.title")}
                      </h3>
                      <p className="why-body">
                        {t("whyDifferent.features.ip.description")}
                      </p>
                    </article>
                  </div>
                </div>

                <div className="reveal">
                  <h3 style={{ margin: "0 0 6px" }}>
                    {t("Common.watchVideo")}
                  </h3>
                  <p
                    style={{
                      margin: "0 0 10px",
                      fontSize: "0.9rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    {t("Common.watchDescription")}
                  </p>
                  <div
                    className="video-embed"
                    style={{
                      borderRadius: 18,
                      boxShadow: "0 18px 40px rgba(0,0,0,0.85)",
                    }}
                  >
                    <iframe
                      src="https://www.youtube.com/embed/_niJrog0TYk"
                      allowFullScreen
                      loading="lazy"
                      title="RICO MATRIX overview"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RICO COIN IMAGE */}
        <section className="section section--tight">
          <div className="container">
            <div className="block-panel image-block reveal">
              <div className="section-head">
                <div className="section-kicker">{t("coinAirdrop.kicker")}</div>
                <p className="section-subtitle">
                  {t("coinAirdrop.description")}
                </p>
              </div>
              <div className="image-frame">
                <img src="/ricocoin.png" alt="RICO coin airdrop visual" />
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="section section--tight">
          <div className="container">
            <div className="block-panel">
              <div className="section-head reveal">
                <div className="section-kicker">{t("faq.kicker")}</div>
                <h2 className="section-title">{t("faq.title")}</h2>
              </div>

              <div className="faq-list">
                {faqKeys.map((key, index) => (
                  <RicoMatrixFaqItem
                    key={key}
                    question={t(`faq.${key}.question`)}
                    answer={t(`faq.${key}.answer`)}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* TELEGRAM SUPPORT STRIP */}
        <section className="section section--tight">
          <div className="container">
            <div className="block-panel support-strip reveal">
              <div>{t("support.help")}</div>
              <div>
                {t("support.team")}{" "}
                <strong>
                  <a
                    href="https://t.me/defilordly"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("support.telegram")}
                  </a>
                </strong>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section id="cta" className="section">
          <div className="container">
            <div className="final-cta reveal">
              <h2>{t("cta.title")}</h2>
              <p>{t("cta.description")}</p>

              <div className="hero-ctas mt-6 flex flex-col sm:flex-row items-center md:items-start gap-4 sm:gap-6 lg:gap-8">
                <MemoizedMobileWalletConnector />

                <a
                  href="https://t.me/ricomatrixdapp"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary flex items-center justify-center h-14 px-8 text-lg rounded-xl"
                >
                  {t("joinTelegram")}
                </a>
              </div>
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                }}
              >
                {t("cta.disclaimer")}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div
            dangerouslySetInnerHTML={renderHTML(
              t("footer.copyright", { year })
            )}
          />{" "}
          <div className="footer-links">
            <a href="https://ricomatrix.com/" target="_blank" rel="noreferrer">
              {t("footer.links.website")}
            </a>
            <a
              href="https://t.me/ricomatrixdapp"
              target="_blank"
              rel="noreferrer"
            >
              {t("footer.links.telegram")}
            </a>
            <a
              href="https://x.com/ricomatrixdapp"
              target="_blank"
              rel="noreferrer"
            >
              {t("footer.links.twitter")}
            </a>
            <a
              href="https://www.youtube.com/@ricomatrix"
              target="_blank"
              rel="noreferrer"
            >
              {t("footer.links.youtube")}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default RicoMatrixLandingPage;
