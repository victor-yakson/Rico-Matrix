"use client";

import React, { useEffect, useMemo, useState, memo, useRef } from "react";
import MobileWalletConnector from "../Common/MobileWalletConnector";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "../Common/LanguageSwitcher";
import WorldMap from "../WorldMap";
import StatsCard from "../StatsCard";

type CountryStat = {
  country: string;
  country_code: string;
  total: number;
  unique_visitors: number;
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
    <article
      className={`faq-item reveal reveal--visible ${
        open ? "faq-item--open" : ""
      }`}
    >
      <div className="faq-header" onClick={handleClick}>
        <div className="faq-question">{question}</div>
        <div className="faq-toggle">{open ? "–" : "+"}</div>
      </div>
      <div className="faq-body">{answer}</div>
    </article>
  );
};


const RicoMatrixLandingPage: React.FC = () => {
  const t = useTranslations("LandingPage");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [mapStats, setMapStats] = useState<CountryStat[]>([]);
  const [mapTotals, setMapTotals] = useState({
    totalVisits: 0,
    uniqueVisitors: 0,
    countries: 0,
  });
  const heroMediaRef = useRef<HTMLDivElement | null>(null);
  const heroWords = useMemo(
    () => [
      t("heroTyping.words.0"),
      t("heroTyping.words.1"),
      t("heroTyping.words.2"),
    ],
    [t]
  );

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadStats = async () => {
      try {
        const res = await fetch("/api/stats");
        if (!res.ok) return;
        const json = await res.json();
        const data: CountryStat[] = json?.data ?? [];
        const totals = json?.totals ?? {};
        const totalVisits =
          typeof totals.total_visits !== "undefined"
            ? Number(totals.total_visits)
            : data.reduce((acc, cur) => acc + Number(cur.total || 0), 0);
        const uniqueVisitors =
          typeof totals.unique_visitors !== "undefined"
            ? Number(totals.unique_visitors)
            : data.reduce(
                (acc, cur) => acc + Number(cur.unique_visitors || 0),
                0
              );
        const countries =
          typeof totals.countries !== "undefined"
            ? Number(totals.countries)
            : data.length;

        setMapStats(data);
        setMapTotals({ totalVisits, uniqueVisitors, countries });
      } catch (error) {
        // Silent fail to avoid blocking the UI
      }
    };

    loadStats();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setWordIndex((prev) => (prev + 1) % heroWords.length);
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [heroWords.length]);


  useEffect(() => {
    const el = heroMediaRef.current;
    if (!el) return;

    const handleMove = (evt: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const relX = (evt.clientX - rect.left) / rect.width - 0.5;
      const relY = (evt.clientY - rect.top) / rect.height - 0.5;
      const max = 14;
      el.style.setProperty("--parallax-x", `${relX * max}px`);
      el.style.setProperty("--parallax-y", `${relY * max}px`);
    };

    const handleLeave = () => {
      el.style.setProperty("--parallax-x", `0px`);
      el.style.setProperty("--parallax-y", `0px`);
    };

    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);

    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  const handleNavClick = (id: string) => (
    e: React.MouseEvent<HTMLAnchorElement>
  ) => {
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

              <MemoizedMobileWalletConnector
                variant="compact"
                desktopButtonLabel={t("activateLevel")}
                mobileButtonLabel={t("activateLevel")}
              />

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

      <main className="landing-main">
        {/* HERO BLOCK */}
        <section className="hero hero--fullscreen">
          <div className="container">
            <div className="hero-layout">
              <div className="hero-copy reveal">
                <h1 className="hero-title">
                  {t("heroTyping.prefix")}{" "}
                  <span className="hero-fade">
                    <span className="hero-fade-word" key={wordIndex}>
                      {heroWords[wordIndex]}
                    </span>
                  </span>
                  {t("heroTyping.suffix") ? ` ${t("heroTyping.suffix")}` : ""}
                </h1>

                <p className="hero-subtitle">{t("subtitle")}</p>

                <div className="hero-minimal-meta">
                  <span>{t("launchInfo.launching")}</span>
                  <span className="hero-minimal-dot" aria-hidden="true"></span>
                  <span>{t("launchInfo.time")}</span>
                </div>

                <div className="hero-ctas mt-6 flex flex-col lg:flex-row items-stretch lg:items-start gap-4 lg:gap-6">
                  <MemoizedMobileWalletConnector
                    className="wallet-inline"
                    desktopButtonLabel={t("activateLevel")}
                    mobileButtonLabel={t("activateLevel")}
                  />

                  <a
                    href="https://t.me/ricomatrixdapp"
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary cta-inline"
                  >
                    {t("joinTelegram")}
                  </a>
                </div>
              </div>

              <div className="hero-media reveal" ref={heroMediaRef}>
                <div className="image-placeholder image-placeholder--hero">
                  <div className="icon-scene">
                    <div className="icon-orbit">
                      <div className="icon-ring" aria-hidden="true"></div>
                      <div className="icon-core" aria-hidden="true">
                        <svg viewBox="0 0 24 24" role="img">
                          <path
                            d="M4 6.5C6.5 5 9 5 12 6.5c3-1.5 5.5-1.5 8 0v11c-2.5-1.5-5-1.5-8 0-3-1.5-5.5-1.5-8 0v-11z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M12 6.5v11"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                      <div className="icon-orb icon-orb--top" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                          <path
                            d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4-3.9-3.8 5.4-.8z"
                            fill="currentColor"
                          />
                        </svg>
                      </div>
                      <div
                        className="icon-orb icon-orb--right"
                        aria-hidden="true"
                      >
                        <svg viewBox="0 0 24 24">
                          <path
                            d="M4 18h16M6 14h3M11 10h3M16 6h2"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                      <div
                        className="icon-orb icon-orb--left"
                        aria-hidden="true"
                      >
                        <svg viewBox="0 0 24 24">
                          <path
                            d="M7 7h10M7 12h10M7 17h7"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="icon-caption">
                      {t("media.items.dashboard")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MEDIA SHOWCASE */}
        <section className="section section--tight">
          <div className="container">
            <div className="block-panel reveal">
              <div className="section-head">
                <div className="section-kicker">{t("media.kicker")}</div>
                <h2 className="section-title">{t("media.title")}</h2>
                <p className="section-subtitle">{t("media.subtitle")}</p>
              </div>

              <div className="image-grid">
                <div className="image-card">
                  <div className="image-placeholder image-placeholder--icon">
                    <div className="icon-stack">
                      <div className="icon-badge icon-badge--book">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M5 6.5c2.4-1.2 4.8-1.2 7.2 0 2.4-1.2 4.8-1.2 7.3 0v11c-2.5-1.3-4.9-1.3-7.3 0-2.4-1.3-4.8-1.3-7.2 0v-11z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.4"
                          />
                          <path
                            d="M12.2 6.5v11"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                      <div className="icon-caption">{t("media.items.book")}</div>
                    </div>
                  </div>
                </div>
                <div className="image-card">
                  <div className="image-placeholder image-placeholder--icon">
                    <div className="icon-stack">
                      <div className="icon-badge icon-badge--dashboard">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M5 19V5h14v14H5z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.4"
                          />
                          <path
                            d="M8 15v-3M12 15V9M16 15v-5"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                      <div className="icon-caption">
                        {t("media.items.dashboard")}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="image-card">
                  <div className="image-placeholder image-placeholder--icon">
                    <div className="icon-stack">
                      <div className="icon-badge icon-badge--mobile">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <rect
                            x="7"
                            y="3.5"
                            width="10"
                            height="17"
                            rx="2"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.4"
                          />
                          <path
                            d="M11 17.5h2"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                      <div className="icon-caption">{t("media.items.mobile")}</div>
                    </div>
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

        {/* GLOBAL MAP + STATS */}
        <section id="world" className="section section--tight">
          <div className="container">
            <div className="block-panel reveal">
              <div className="section-head">
                <div className="section-kicker">{t("worldMap.kicker")}</div>
                <h2 className="section-title">{t("worldMap.title")}</h2>
                <p className="section-subtitle">{t("worldMap.subtitle")}</p>
              </div>

              <div className="map-grid">
                <WorldMap data={mapStats} />
                <div className="map-stats">
                  <StatsCard
                    label={t("worldMap.stats.readers")}
                    value={mapTotals.uniqueVisitors.toLocaleString()}
                    note={t("worldMap.stats.readersNote")}
                  />
                  <StatsCard
                    label={t("worldMap.stats.visits")}
                    value={mapTotals.totalVisits.toLocaleString()}
                    note={t("worldMap.stats.visitsNote")}
                  />
                  <StatsCard
                    label={t("worldMap.stats.countries")}
                    value={mapTotals.countries.toLocaleString()}
                    note={t("worldMap.stats.countriesNote")}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* X3 + X6 TRACKS */}
        <section className="section section--tight">
          <div className="container">
            <div className="block-panel reveal">
              <div className="section-head">
                <div className="section-kicker">{t("visuals.x3.kicker")}</div>
                <h2 className="section-title">
                  {t("visuals.x3.title")} · {t("visuals.x6.title")}
                </h2>
                <p className="section-subtitle">{t("visuals.x3.subtitle")}</p>
              </div>
              <div className="grid grid--2">
                <article className="card reveal">
                  <div className="card-kicker">{t("visuals.x3.kicker")}</div>
                  <h3 className="card-title">{t("visuals.x3.title")}</h3>
                  <p className="card-body clamp-3">{t("visuals.x3.note")}</p>
                </article>
                <article className="card reveal">
                  <div className="card-kicker">{t("visuals.x6.kicker")}</div>
                  <h3 className="card-title">{t("visuals.x6.title")}</h3>
                  <p className="card-body clamp-3">{t("visuals.x6.note")}</p>
                </article>
              </div>
              <div className="image-grid image-grid--compact">
                <div className="image-card">
                  <div className="image-placeholder image-placeholder--icon">
                    <div className="matrix-icon matrix-icon--x3" aria-hidden="true">
                      <span className="matrix-dot"></span>
                      <span className="matrix-dot"></span>
                      <span className="matrix-dot"></span>
                    </div>
                    <div className="icon-caption">{t("visuals.x3.title")}</div>
                  </div>
                </div>
                <div className="image-card">
                  <div className="image-placeholder image-placeholder--icon">
                    <div className="matrix-icon matrix-icon--x6" aria-hidden="true">
                      <span className="matrix-dot"></span>
                      <span className="matrix-dot"></span>
                      <span className="matrix-dot"></span>
                      <span className="matrix-dot"></span>
                      <span className="matrix-dot"></span>
                      <span className="matrix-dot"></span>
                    </div>
                    <div className="icon-caption">{t("visuals.x6.title")}</div>
                  </div>
                </div>
              </div>
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
                  <p className="card-body clamp-3">
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
                  <p className="card-body clamp-3">
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
                  <p className="card-body clamp-3">
                    {t("whyJoin.features.royalty.description")}
                  </p>
                </article>
              </div>
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
                      className="step-body clamp-3"
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
                      className="step-body clamp-3"
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
                      className="step-body clamp-3"
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
                  <p className="video-desc clamp-2">
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
                  <p className="video-desc clamp-2">
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
                  <p className="video-desc clamp-2">
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

              <div className="pill-grid">
                {[
                  "USDT",
                  "BNB Smart Chain",
                  "Alchemy Pay",
                  "Trust Wallet",
                  "SafePal",
                  "Remix",
                  "MetaMask",
                ].map((label) => (
                  <div key={label} className="pill">
                    {label}
                  </div>
                ))}
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

        {/* FINAL CTA */}
        <section id="cta" className="section">
          <div className="container">
            <div className="final-cta reveal">
              <h2>{t("cta.title")}</h2>
              <p>{t("cta.description")}</p>

              <div className="hero-ctas mt-6 flex flex-col lg:flex-row items-stretch lg:items-start gap-4 lg:gap-6">
                <MemoizedMobileWalletConnector
                  className="wallet-inline"
                  desktopButtonLabel={t("activateLevel")}
                  mobileButtonLabel={t("activateLevel")}
                />

                <a
                  href="https://t.me/ricomatrixdapp"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary cta-inline"
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

      {/* Footer rendered globally */}
    </div>
  );
};

export default RicoMatrixLandingPage;
