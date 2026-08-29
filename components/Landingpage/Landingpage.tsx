"use client";
/* eslint-disable @next/next/no-img-element */

import React, { memo, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import MobileWalletConnector from "../Common/MobileWalletConnector";
import { LanguageSwitcher } from "../Common/LanguageSwitcher";
import WorldMap, { type WorldMapCountryStat } from "../WorldMap";
import { isRicoQuantEngineLive } from "@/lib/launchSchedule";
import styles from "./Landingpage.module.css";

type MapTotals = {
  uniqueVisitors: number;
  countries: number;
  topCountryName: string;
  topCountryVisitors: number;
};

const MemoizedMobileWalletConnector = memo(MobileWalletConnector);
const faqKeys = [
  "questions.0",
  "questions.1",
  "questions.2",
  "questions.3",
  "questions.4",
  "questions.5",
  "questions.6",
] as const;

const revealMotion = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as const },
  },
};

function FeatureIcon({ kind }: { kind: "skills" | "library" | "token" | "airdrop" | "staking" | "royalty" }) {
  const common: React.SVGProps<SVGSVGElement> = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" };

  switch (kind) {
    case "skills":
      return (
        <svg {...common}>
          <path d="M4 6.5 12 3l8 3.5-8 3.5L4 6.5Z" />
          <path d="M7 9v5.5c0 1.7 2.2 3.5 5 3.5s5-1.8 5-3.5V9" />
          <path d="M20 6.5V12" />
        </svg>
      );
    case "library":
      return (
        <svg {...common}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z" />
          <path d="M8 7h7" />
          <path d="M8 11h9" />
          <path d="M8 15h6" />
        </svg>
      );
    case "token":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M9.5 9.5c.5-1 1.4-1.5 2.7-1.5 1.9 0 3 1 3 2.4 0 1.2-.8 2-2.2 2.4l-1 .3c-.8.2-1.3.6-1.5 1.4" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "airdrop":
      return (
        <svg {...common}>
          <path d="M12 3v12" />
          <path d="M7 10.5 12 15l5-4.5" />
          <path d="M4 18.5c1.8 1.7 4.4 2.5 8 2.5s6.2-.8 8-2.5" />
        </svg>
      );
    case "staking":
      return (
        <svg {...common}>
          <path d="M12 3 5 7v5c0 4 2.5 6.9 7 9 4.5-2.1 7-5 7-9V7l-7-4Z" />
          <path d="M9.5 12.5 11 14l3.5-4" />
        </svg>
      );
    case "royalty":
      return (
        <svg {...common}>
          <path d="M5 18 8.5 8l3.5 6 3.5-8 3.5 12" />
          <path d="M4 20h16" />
        </svg>
      );
    default:
      return null;
  }
}

function SectionHeading({ kicker, title, subtitle, align = "center" }: { kicker: string; title: string; subtitle?: string; align?: "center" | "left" }) {
  return (
    <div className={`${styles.sectionHead} ${align === "left" ? styles.sectionHeadLeft : ""}`}>
      <span className={styles.sectionKicker}>{kicker}</span>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {subtitle ? <p className={styles.sectionSubtitle}>{subtitle}</p> : null}
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`${styles.faqItem} ${open ? styles.faqItemOpen : ""}`}>
      <button
        type="button"
        className={styles.faqButton}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span>{question}</span>
        <span className={styles.faqIcon} aria-hidden="true">
          <span className={styles.faqBarHorizontal} />
          <span className={styles.faqBarVertical} />
        </span>
      </button>
      <div className={styles.faqAnswerWrap}>
        <div className={styles.faqAnswer}>{answer}</div>
      </div>
    </div>
  );
}

function CounterChip({ value, label, delay = 0 }: { value: string; label: string; delay?: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [hasAnimated, setHasAnimated] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const numericMatch = value.match(/^(\d+)(\+)?$/);
    if (!numericMatch || shouldReduceMotion) {
      setDisplayValue(value);
      return;
    }

    const target = Number(numericMatch[1]);
    const suffix = numericMatch[2] ?? "";
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting || hasAnimated) return;
        setHasAnimated(true);

        let frameId = 0;
        const startedAt = performance.now() + delay;
        const duration = 1200;

        const tick = (now: number) => {
          if (now < startedAt) {
            frameId = window.requestAnimationFrame(tick);
            return;
          }

          const progress = Math.min((now - startedAt) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = Math.round(target * eased);
          setDisplayValue(`${current}${suffix}`);
          if (progress < 1) frameId = window.requestAnimationFrame(tick);
        };

        frameId = window.requestAnimationFrame(tick);
        observer.disconnect();

        return () => window.cancelAnimationFrame(frameId);
      },
      { threshold: 0.35 }
    );

    const element = document.getElementById(`counter-${label}`);
    if (element) observer.observe(element);
    return () => observer.disconnect();
  }, [delay, hasAnimated, label, shouldReduceMotion, value]);

  return (
    <div id={`counter-${label}`} className={styles.counterCell}>
      <strong className={styles.counterValue}>{displayValue}</strong>
      <span className={styles.counterLabel}>{label}</span>
    </div>
  );
}

function MatrixNode({ label, variant }: { label: string; variant: "you" | "direct" | "spillover" }) {
  return (
    <div className={`${styles.matrixNode} ${styles[`matrixNode${variant[0].toUpperCase()}${variant.slice(1)}`]}`}>
      <span className={styles.matrixNodeCore} />
      <span className={styles.matrixNodeLabel}>{label}</span>
    </div>
  );
}

export default function RicoMatrixLandingPage() {
  const t = useTranslations("LandingPage");
  const shouldReduceMotion = useReducedMotion();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [matrixMode, setMatrixMode] = useState<"x3" | "x6">("x3");
  const [mapStats, setMapStats] = useState<WorldMapCountryStat[]>([]);
  const [mapTotals, setMapTotals] = useState<MapTotals>({
    uniqueVisitors: 0,
    countries: 0,
    topCountryName: "—",
    topCountryVisitors: 0,
  });
  const [mapState, setMapState] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false });
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  const heroWords = useMemo(
    () => [t("heroTyping.words.0"), t("heroTyping.words.1"), t("heroTyping.words.2")],
    [t]
  );

  const navLinks = useMemo(
    () => [
      { id: "ecosystem", label: t("nav.ecosystem") },
      { id: "skills", label: t("nav.skills") },
      { id: "library", label: t("nav.library") },
      { id: "staking", label: t("nav.staking") },
      { id: "levels", label: t("nav.levels") },
      { id: "faq", label: t("nav.faq") },
    ],
    [t]
  );

  const heroChips = useMemo(
    () => [
      { value: t("proof.stats.0.value"), label: t("proof.stats.0.label") },
      { value: t("proof.stats.1.value"), label: t("proof.stats.1.label") },
      { value: "X3 + X6", label: t("matrixOverview.title") },
      { value: "RICO", label: t("matrixOverview.footer.farming") },
    ],
    [t]
  );

  const counterStats = useMemo(
    () => [
      { value: t("proof.stats.0.value"), label: t("proof.stats.0.label") },
      { value: t("proof.stats.1.value"), label: t("proof.stats.1.label") },
      { value: t("proof.stats.2.value"), label: t("proof.stats.2.label") },
      { value: t("proof.stats.3.value"), label: t("proof.stats.3.label") },
    ],
    [t]
  );

  const ecosystemCards = useMemo(
    () => [
      { kind: "skills" as const, kicker: t("ecosystem.cards.skills.kicker"), title: t("ecosystem.cards.skills.title"), description: t("ecosystem.cards.skills.description") },
      { kind: "library" as const, kicker: t("ecosystem.cards.library.kicker"), title: t("ecosystem.cards.library.title"), description: t("ecosystem.cards.library.description") },
      { kind: "token" as const, kicker: t("ecosystem.cards.token.kicker"), title: t("ecosystem.cards.token.title"), description: t("ecosystem.cards.token.description") },
      { kind: "airdrop" as const, kicker: t("ecosystem.cards.airdrop.kicker"), title: t("ecosystem.cards.airdrop.title"), description: t("ecosystem.cards.airdrop.description") },
      { kind: "staking" as const, kicker: t("ecosystem.cards.staking.kicker"), title: t("ecosystem.cards.staking.title"), description: t("ecosystem.cards.staking.description") },
      { kind: "royalty" as const, kicker: t("ecosystem.cards.royalty.kicker"), title: t("ecosystem.cards.royalty.title"), description: t("ecosystem.cards.royalty.description") },
    ],
    [t]
  );

  const accessMilestones = useMemo(
    () => [
      { step: t("access.steps.0.step"), title: t("access.steps.0.title"), description: t("access.steps.0.description") },
      { step: t("access.steps.1.step"), title: t("access.steps.1.title"), description: t("access.steps.1.description") },
      { step: t("access.steps.2.step"), title: t("access.steps.2.title"), description: t("access.steps.2.description") },
      { step: t("access.steps.3.step"), title: t("access.steps.3.title"), description: t("access.steps.3.description") },
    ],
    [t]
  );

  const skillsPoints = useMemo(
    () => [t("skills.points.0"), t("skills.points.1"), t("skills.points.2"), t("skills.points.3"), t("skills.points.4")],
    [t]
  );

  const libraryPoints = useMemo(
    () => [t("libraryFeature.points.0"), t("libraryFeature.points.1"), t("libraryFeature.points.2"), t("libraryFeature.points.3")],
    [t]
  );

  const tokenUtilityCards = useMemo(
    () => [t("tokenUtility.cards.0"), t("tokenUtility.cards.1"), t("tokenUtility.cards.2"), t("tokenUtility.cards.3")],
    [t]
  );

  const stakingCards = useMemo(
    () => [
      { title: t("staking.cards.0.title"), description: t("staking.cards.0.description") },
      { title: t("staking.cards.1.title"), description: t("staking.cards.1.description") },
      { title: t("staking.cards.2.title"), description: t("staking.cards.2.description") },
    ],
    [t]
  );

  const pricingCards = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const level = index + 1;
        return {
          level,
          title: t(`levels.chapters.level${level}`),
          price: t(`levels.prices.level${level}`),
          description: t(`levels.descriptions.level${level}`),
        };
      }),
    [t]
  );

  const footerLinks = useMemo(
    () => [
      { label: t("footer.links.website"), href: "https://ricomatrix.com/" },
      { label: t("footer.links.whitepaper"), href: "https://rico-token.gitbook.io/rico" },
      { label: t("footer.links.telegram"), href: "https://t.me/ricomatrixdapp" },
      { label: t("footer.links.twitter"), href: "https://x.com/rmdapp" },
      { label: t("footer.links.youtube"), href: "https://www.youtube.com/@ricomatrix" },
      { label: "Email", href: "mailto:info@ricomatrix.com" },
    ],
    [t]
  );

  const stars = useMemo(
    () =>
      Array.from({ length: 22 }, (_, index) => ({
        id: index,
        left: `${(index * 11 + 7) % 100}%`,
        top: `${(index * 17 + 13) % 100}%`,
        delay: `${(index % 8) * 0.6}s`,
        size: `${index % 3 === 0 ? 3 : 2}px`,
      })),
    []
  );

  useEffect(() => {
    if (typeof window === "undefined" || shouldReduceMotion) return;
    const mq = window.matchMedia("(max-width: 767px)");
    if (mq.matches) {
      setWordIndex(0);
      return;
    }
    const id = window.setInterval(() => {
      setWordIndex((current) => (current + 1) % heroWords.length);
    }, 3600);
    return () => window.clearInterval(id);
  }, [heroWords.length, shouldReduceMotion]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const loadStats = async () => {
      try {
        setMapState("loading");
        const response = await fetch("/api/stats", { cache: "no-store" });
        if (!response.ok) {
          setMapState("error");
          return;
        }
        const payload = await response.json();
        const data: WorldMapCountryStat[] = payload?.data ?? [];
        const totals = payload?.totals ?? {};
        const uniqueVisitors = typeof totals.unique_visitors !== "undefined"
          ? Number(totals.unique_visitors)
          : data.reduce((sum, item) => sum + Number(item.unique_visitors || 0), 0);
        const countries = typeof totals.countries !== "undefined" ? Number(totals.countries) : data.length;
        const topCountryName = typeof totals.top_country_name === "string" && totals.top_country_name ? totals.top_country_name : data[0]?.country_name || "—";
        const topCountryVisitors = typeof totals.top_country_visitors !== "undefined" ? Number(totals.top_country_visitors) : Number(data[0]?.unique_visitors || 0);
        setMapStats(data);
        setMapTotals({ uniqueVisitors, countries, topCountryName, topCountryVisitors });
        setMapState(data.length ? "ready" : "empty");
      } catch {
        setMapState("error");
      }
    };

    void loadStats();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(pointer: fine)");
    if (!mediaQuery.matches) return;

    const handleMove = (event: MouseEvent) => {
      setCursor({ x: event.clientX, y: event.clientY, visible: true });
    };
    const handleLeave = () => setCursor((current) => ({ ...current, visible: false }));

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseleave", handleLeave);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000);

    return () => window.clearInterval(timerId);
  }, []);

  const closeDrawer = () => setMobileNavOpen(false);

  const isQuantEngineLive = useMemo(() => isRicoQuantEngineLive(currentTime), [currentTime]);
  const quantEngineBadge = isQuantEngineLive
    ? t("quantEngine.liveBadge")
    : t("quantEngine.launchBadge");
  const quantEngineTimeLabel = isQuantEngineLive
    ? t("quantEngine.liveTime")
    : t("quantEngine.launchTime");
  const quantEngineTitle = isQuantEngineLive
    ? t("quantEngine.liveTitle")
    : t("quantEngine.title");
  const quantEngineSubtitle = isQuantEngineLive
    ? t("quantEngine.liveSubtitle")
    : t("quantEngine.subtitle");

  return (
    <div className={styles.page} id="top">
      <div className={styles.ambientBackdrop} aria-hidden="true" />
      <div className={styles.gridBackdrop} aria-hidden="true" />
      <div className={styles.orbOne} aria-hidden="true" />
      <div className={styles.orbTwo} aria-hidden="true" />
      <div className={styles.cursorGlow} style={{ opacity: cursor.visible ? 1 : 0, transform: `translate(${cursor.x}px, ${cursor.y}px)` }} />
      <div className={styles.cursorDot} style={{ opacity: cursor.visible ? 1 : 0, transform: `translate(${cursor.x}px, ${cursor.y}px)` }} />

      <header className={styles.navbar}>
        <button type="button" className={styles.logoButton} onClick={() => document.getElementById("top")?.scrollIntoView({ behavior: "smooth" })} aria-label="Rico Matrix home">
          <span className={styles.logoHalo} aria-hidden="true" />
          <img src="/logo.png" alt="Rico Matrix" className={styles.logoImage} />
          {/* <span className={styles.logoText}>RicoMatrix</span> */}
        </button>

        <nav className={styles.desktopNav} aria-label="Landing page navigation">
          {navLinks.map((link) => (
            <a key={link.id} href={`#${link.id}`} className={styles.navLink}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className={styles.navActions}>
          <div className={styles.navControl}><LanguageSwitcher /></div>
          <MemoizedMobileWalletConnector
            variant="compact"
            className={styles.walletSlot}
            buttonClassName={styles.walletButtonSkin}
            desktopButtonLabel={t("activateLevel")}
            mobileButtonLabel={t("activateLevel")}
          />
          <button
            type="button"
            className={`${styles.navToggle} ${mobileNavOpen ? styles.navToggleOpen : ""}`}
            onClick={() => setMobileNavOpen((current) => !current)}
            aria-label="Toggle navigation"
            aria-expanded={mobileNavOpen}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {mobileNavOpen ? (
          <>
            <motion.button
              type="button"
              className={styles.drawerBackdrop}
              onClick={closeDrawer}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-label="Close navigation menu"
            />
            <motion.nav
              className={styles.mobileDrawer}
              initial={{ opacity: 0, x: 36 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 36 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              aria-label="Mobile navigation"
            >
              <div className={styles.mobileDrawerTop}>
                <span className={styles.sectionKicker}>{t("heroBadge")}</span>
                <button type="button" className={styles.drawerClose} onClick={closeDrawer} aria-label="Close menu">
                  ×
                </button>
              </div>
              <div className={styles.mobileDrawerLinks}>
                {navLinks.map((link) => (
                  <a key={link.id} href={`#${link.id}`} onClick={closeDrawer} className={styles.mobileLink}>
                    {link.label}
                  </a>
                ))}
              </div>
              <a href="https://rico-token.gitbook.io/rico" target="_blank" rel="noreferrer" className={styles.drawerExternal}>
                {t("footer.links.whitepaper")}
              </a>
            </motion.nav>
          </>
        ) : null}
      </AnimatePresence>

      <main className={styles.main}>
        <section className={`${styles.section} ${styles.heroSection}`}>
          <div className={styles.container}>
            <div className={styles.heroGrid}>
              <motion.div initial="hidden" animate="visible" variants={revealMotion} className={styles.heroCopy}>
                <div className={styles.badgeRow}>
                  <span className={styles.liveBadge}>{t("launchInfo.launching")}</span>
                  <span className={styles.liveBadgeSecondary}>{quantEngineTimeLabel}</span>
                </div>
                <div className={styles.glitchTag} aria-label="Read Earn Own">
                  <span>READ • EARN • OWN</span>
                </div>
                <h1 className={styles.heroTitle}>{t("title")}</h1>
                <p className={styles.heroDynamicLine}>
                  {t("heroTyping.prefix")} {" "}
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={heroWords[wordIndex]}
                      className={styles.heroWord}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: shouldReduceMotion ? 0 : 0.35 }}
                    >
                      {heroWords[wordIndex]}
                    </motion.span>
                  </AnimatePresence>
                  {" "}{t("heroTyping.suffix")}
                </p>
                <p className={styles.heroSubtitle}>{t("subtitle")}</p>

                <div className={styles.heroMetaPills}>
                  <span className={styles.heroMiniPill}>{t("launchInfo.badges.decentralized")}</span>
                  <span className={styles.heroMiniPill}>{t("launchInfo.badges.omnichain")}</span>
                  <span className={styles.heroMiniPill}>{t("launchInfo.badges.earnings")}</span>
                  <span className={styles.heroMiniPill}>{t("launchInfo.badges.royalty")}</span>
                </div>

                <div className={styles.heroCtas}>
                  <MemoizedMobileWalletConnector
                    className={styles.heroWalletSlot}
                    buttonClassName={styles.heroWalletSkin}
                    desktopButtonLabel={t("activateLevel")}
                    mobileButtonLabel={t("activateLevel")}
                  />
                  <a href="#ecosystem" className={styles.secondaryCta}>
                    {t("exploreEcosystem")}
                  </a>
                </div>

                {/* <div className={styles.heroChipRow}>
                  {heroChips.map((chip) => (
                    <div key={chip.label} className={styles.heroChip}>
                      <strong>{chip.value}</strong>
                      <span>{chip.label}</span>
                    </div>
                  ))}
                </div> */}
              </motion.div>

              <motion.div initial="hidden" animate="visible" variants={revealMotion} className={styles.heroVisual}>
                <div className={styles.heroVisualShell}>
                  <div className={styles.heroSceneGlow} aria-hidden="true" />
                  <div className={styles.starField} aria-hidden="true">
                    {stars.map((star) => (
                      <span key={star.id} className={styles.star} style={{ left: star.left, top: star.top, animationDelay: star.delay, width: star.size, height: star.size }} />
                    ))}
                  </div>
                  <div className={styles.heroWireframe} aria-hidden="true" />
                  <div className={styles.bookStack}>
                    {Array.from({ length: 9 }, (_, index) => (
                      <div key={index} className={styles.bookTile} style={{ ["--tile-index" as never]: index } as React.CSSProperties}>
                        <span className={styles.bookTileEdge} />
                        <span className={styles.bookTileLabel}>{index === 4 ? "RM CORE" : `NODE ${index + 1}`}</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.heroVisualCard}>
                    <span className={styles.visualCardKicker}>{t("matrixOverview.blockchain")}</span>
                    <strong>{t("matrixOverview.title")}</strong>
                    <p>{t("matrixOverview.subtitle")}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className={styles.counterBarSection}>
          <div className={styles.containerWide}>
            <div className={styles.counterBar}>
              {counterStats.map((item, index) => (
                <CounterChip key={item.label} value={item.value} label={item.label} delay={index * 80} />
              ))}
            </div>
          </div>
        </section>

        <motion.section id="videos" className={`${styles.section} ${styles.sectionTight}`} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={revealMotion}>
          <div className={styles.container}>
            <div className={styles.videoPanel}>
              <div className={styles.videoFrame}>
                <iframe
                  src="https://www.youtube.com/embed/yGyamkoQEBc?si=v8yKJz8yN8cIlZ3a"
                  title={t("media.title")}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
              <div className={styles.videoCopy}>
                <SectionHeading kicker={t("media.kicker")} title={t("media.title")} subtitle={t("media.subtitle")} align="left" />
                <div className={styles.videoPointList}>
                  {[t("media.items.book"), t("media.items.dashboard"), t("media.items.mobile")].map((item) => (
                    <div key={item} className={styles.videoPoint}>
                      <span className={styles.videoPointDot} aria-hidden="true" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section className={`${styles.section} ${styles.sectionTight}`} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={revealMotion}>
          <div className={styles.container}>
            <div className={styles.engineLaunchPanel}>
              <div className={styles.engineLaunchCopy}>
                <div className={styles.badgeRow}>
                  <span className={styles.liveBadge}>{quantEngineBadge}</span>
                  <span className={styles.liveBadgeSecondary}>{quantEngineTimeLabel}</span>
                </div>
                <SectionHeading
                  kicker={t("quantEngine.kicker")}
                  title={quantEngineTitle}
                  subtitle={quantEngineSubtitle}
                  align="left"
                />
                <p className={styles.engineLaunchDescription}>{t("quantEngine.description")}</p>
                <div className={styles.engineLaunchPoints}>
                  {[t("quantEngine.points.0"), t("quantEngine.points.1"), t("quantEngine.points.2")].map((item) => (
                    <div key={item} className={styles.engineLaunchPoint}>
                      <span className={styles.videoPointDot} aria-hidden="true" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.heroCtas}>
                  <a href="https://app.ricomatrix.com" target="_blank" rel="noreferrer" className={styles.engineLaunchCta}>
                    {isQuantEngineLive ? t("quantEngine.ctaLive") : t("quantEngine.ctaLaunch")}
                  </a>
                  <a
                    href="https://app.ricomatrix.com"
                    target="_blank"
                    rel="noreferrer"
                    className={styles.engineLaunchGhostLink}
                  >
                    app.ricomatrix.com
                  </a>
                </div>
              </div>
              <a
                href="https://app.ricomatrix.com"
                target="_blank"
                rel="noreferrer"
                className={styles.engineLaunchCard}
                aria-label="Open Rico Quant Bot on app.ricomatrix.com"
              >
                <span className={styles.statementKicker}>{t("quantEngine.card.kicker")}</span>
                <h3>{t("quantEngine.card.title")}</h3>
                <p>{t("quantEngine.card.description")}</p>
                <div className={styles.engineLaunchStatGrid}>
                  <div className={styles.engineLaunchStat}>
                    <span>{t("quantEngine.card.stats.0.label")}</span>
                    <strong>{t("quantEngine.card.stats.0.value")}</strong>
                  </div>
                  <div className={styles.engineLaunchStat}>
                    <span>{t("quantEngine.card.stats.1.label")}</span>
                    <strong>{t("quantEngine.card.stats.1.value")}</strong>
                  </div>
                </div>
                <span className={styles.engineLaunchCardAction}>
                  {isQuantEngineLive ? t("quantEngine.ctaLive") : t("quantEngine.ctaLaunch")}
                </span>
              </a>
            </div>
          </div>
        </motion.section>

        <motion.section id="ecosystem" className={styles.section} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={revealMotion}>
          <div className={styles.container}>
            <SectionHeading kicker={t("ecosystem.kicker")} title={t("ecosystem.title")} subtitle={t("ecosystem.subtitle")} />
            <div className={styles.featureGrid}>
              {ecosystemCards.map((card) => (
                <div key={card.title} className={styles.featureCard}>
                  <div className={styles.featureIconWrap}><FeatureIcon kind={card.kind} /></div>
                  <span className={styles.featureKicker}>{card.kicker}</span>
                  <h3 className={styles.featureTitle}>{card.title}</h3>
                  <p className={styles.featureDescription}>{card.description}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section id="access" className={styles.section} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.18 }} variants={revealMotion}>
          <div className={styles.container}>
            <SectionHeading kicker={t("access.kicker")} title={t("access.title")} subtitle={t("access.subtitle")} />
            <div className={styles.pyramidWrap}>
              <div className={styles.pyramidLine} aria-hidden="true" />
              <div className={styles.pyramidGrid}>
                {accessMilestones.map((item, index) => (
                  <div key={item.step} className={`${styles.pyramidCard} ${styles[`pyramidCard${index + 1}`]}`}>
                    <span className={styles.pyramidStep}>{item.step}</span>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section id="skills" className={styles.section} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.18 }} variants={revealMotion}>
          <div className={styles.container}>
            <div className={styles.splitPanel}>
              <div className={styles.splitPrimary}>
                <SectionHeading kicker={t("skills.kicker")} title={t("skills.title")} subtitle={t("skills.subtitle")} align="left" />
                <div className={styles.tagCloud}>
                  {skillsPoints.map((point) => (
                    <span key={point} className={styles.tagChip}>{point}</span>
                  ))}
                </div>
              </div>
              <div className={styles.statementCard}>
                <span className={styles.statementKicker}>{t("skills.sideCard.kicker")}</span>
                <h3>{t("skills.sideCard.title")}</h3>
                <p>{t("skills.sideCard.description")}</p>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section id="library" className={styles.section} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.18 }} variants={revealMotion}>
          <div className={styles.container}>
            <div className={styles.splitPanelReverse}>
              <div className={styles.statementCardGold}>
                <span className={styles.statementKicker}>{t("libraryFeature.kicker")}</span>
                <h3>{t("libraryFeature.title")}</h3>
                <p>{t("libraryFeature.subtitle")}</p>
              </div>
              <div className={styles.splitPrimary}>
                <div className={styles.tagCloud}>
                  {libraryPoints.map((point) => (
                    <span key={point} className={styles.tagChip}>{point}</span>
                  ))}
                </div>
                <p className={styles.detailNote}>{t("libraryFeature.note")}</p>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section className={`${styles.section} ${styles.sectionTight}`} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={revealMotion}>
          <div className={styles.container}>
            <SectionHeading kicker={t("tokenUtility.kicker")} title={t("tokenUtility.title")} subtitle={t("tokenUtility.subtitle")} />
            <div className={styles.utilityRibbon}>
              {tokenUtilityCards.map((item) => (
                <div key={item} className={styles.utilityCard}>{item}</div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section id="how" className={styles.section} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={revealMotion}>
          <div className={styles.container}>
            <SectionHeading kicker={t("howItWorks.kicker")} title={t("howItWorks.title")} subtitle={t("howItWorks.subtitle")} />
            <div className={styles.stepsTrack}>
              <div className={styles.stepsConnector} aria-hidden="true" />
              {(["step1", "step2", "step3"] as const).map((key, index) => (
                <div key={key} className={styles.stepCard}>
                  <span className={styles.stepIndex}>{t(`howItWorks.steps.${key}.index`)}</span>
                  <h3>{t(`howItWorks.steps.${key}.title`)}</h3>
                  <p>{t(`howItWorks.steps.${key}.description`)}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section className={styles.section} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={revealMotion}>
          <div className={styles.container}>
            <div className={styles.matrixPanel}>
              <div className={styles.matrixHeader}>
                <SectionHeading
                  kicker={matrixMode === "x3" ? t("visuals.x3.kicker") : t("visuals.x6.kicker")}
                  title={matrixMode === "x3" ? t("visuals.x3.title") : t("visuals.x6.title")}
                  subtitle={matrixMode === "x3" ? t("visuals.x3.note") : t("visuals.x6.note")}
                  align="left"
                />
                <div className={styles.matrixToggle}>
                  <button
                    type="button"
                    className={`${styles.matrixToggleButton} ${matrixMode === "x3" ? styles.matrixToggleButtonActive : ""}`}
                    onClick={() => setMatrixMode("x3")}
                  >
                    X3
                  </button>
                  <button
                    type="button"
                    className={`${styles.matrixToggleButton} ${matrixMode === "x6" ? styles.matrixToggleButtonActive : ""}`}
                    onClick={() => setMatrixMode("x6")}
                  >
                    X6
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {matrixMode === "x3" ? (
                  <motion.div key="x3" className={styles.matrixStage} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <div className={styles.matrixColumn}>
                      <MatrixNode label="You" variant="you" />
                    </div>
                    <div className={styles.matrixConnectorsX3} aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className={styles.matrixRowThree}>
                      <MatrixNode label="Direct" variant="direct" />
                      <MatrixNode label="Direct" variant="direct" />
                      <MatrixNode label="Direct" variant="direct" />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="x6" className={styles.matrixStage} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <div className={styles.matrixColumn}>
                      <MatrixNode label="You" variant="you" />
                    </div>
                    <div className={styles.matrixConnectorsX6Top} aria-hidden="true">
                      <span />
                      <span />
                    </div>
                    <div className={styles.matrixRowTwo}>
                      <MatrixNode label="Direct" variant="direct" />
                      <MatrixNode label="Direct" variant="direct" />
                    </div>
                    <div className={styles.matrixConnectorsX6Bottom} aria-hidden="true">
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className={styles.matrixRowFour}>
                      <MatrixNode label="Spillover" variant="spillover" />
                      <MatrixNode label="Spillover" variant="spillover" />
                      <MatrixNode label="Spillover" variant="spillover" />
                      <MatrixNode label="Spillover" variant="spillover" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.section>

        <motion.section id="levels" className={styles.section} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={revealMotion}>
          <div className={styles.container}>
            <SectionHeading kicker={t("levels.kicker")} title={t("matrixOverview.title")} subtitle={t("levels.subtitle")} />
            <div className={styles.pricingGrid}>
              {pricingCards.map((card) => (
                <div key={card.level} className={`${styles.pricingCard} ${card.level === 9 ? styles.pricingCardFeatured : ""}`}>
                  {card.level === 9 ? <span className={styles.recommendedBadge}>Recommended</span> : null}
                  <span className={styles.pricingLevel}>{card.title}</span>
                  <strong className={styles.pricingValue}>{card.price}</strong>
                  <p className={styles.pricingDescription}>{card.description}</p>
                </div>
              ))}
            </div>
            <p className={styles.pricingNote}>{t("levels.note")}</p>
          </div>
        </motion.section>

        <motion.section id="airdrop" className={styles.section} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={revealMotion}>
          <div className={styles.container}>
            <SectionHeading kicker={t("airdropFlow.kicker")} title={t("airdropFlow.title")} subtitle={t("airdropFlow.subtitle")} />
            <div className={styles.airdropTrack}>
              <div className={styles.airdropConnector} aria-hidden="true" />
              <span className={styles.airdropToken} aria-hidden="true">◈</span>
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className={styles.airdropStep}>
                  <span className={styles.airdropIndex}>{String(index + 1).padStart(2, "0")}</span>
                  <h3>{t(`airdropFlow.steps.${index}.title`)}</h3>
                  <p>{t(`airdropFlow.steps.${index}.description`)}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section id="staking" className={styles.section} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={revealMotion}>
          <div className={styles.container}>
            <div className={styles.stakingPanel}>
              <SectionHeading kicker={t("staking.kicker")} title={t("staking.title")} subtitle={t("staking.subtitle")} />
              <div className={styles.stakingBody}>
                <div className={styles.stakingRingWrap}>
                  <div className={styles.stakingRing}>
                    <div className={styles.stakingRingInner}>
                      <span className={styles.stakingToken}>RICO</span>
                      <strong>APY</strong>
                    </div>
                  </div>
                </div>
                <div className={styles.stakingColumns}>
                  {stakingCards.map((card) => (
                    <div key={card.title} className={styles.stakingCard}>
                      <h3>{card.title}</h3>
                      <p>{card.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section id="world" className={styles.section} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={revealMotion}>
          <div className={styles.container}>
            <SectionHeading kicker={t("worldMap.kicker")} title={t("worldMap.title")} subtitle={t("worldMap.subtitle")} />
            <div className={styles.mapShell}>
              <div className={styles.mapFrame}>
                {mapState === "loading" ? <div className={styles.mapState}>{t("worldMap.loading")}</div> : null}
                {mapState === "error" ? <div className={styles.mapState}>{t("worldMap.error")}</div> : null}
                {mapState === "empty" ? <div className={styles.mapState}>{t("worldMap.empty")}</div> : null}
                {mapState === "ready" ? <WorldMap data={mapStats} /> : null}
              </div>
              <div className={styles.mapStatsColumn}>
                <div className={styles.mapStatCard}>
                  <span>{t("worldMap.stats.readers")}</span>
                  <strong>{mapTotals.uniqueVisitors.toLocaleString()}</strong>
                  <p>{t("worldMap.stats.readersNote")}</p>
                </div>
                <div className={styles.mapStatCard}>
                  <span>{t("worldMap.stats.countries")}</span>
                  <strong>{mapTotals.countries.toLocaleString()}</strong>
                  <p>{t("worldMap.stats.countriesNote")}</p>
                </div>
                <div className={styles.mapStatCard}>
                  <span>{t("worldMap.stats.leadingCountry")}</span>
                  <strong>{mapTotals.topCountryName}</strong>
                  <p>{`${mapTotals.topCountryVisitors.toLocaleString()} ${t("worldMap.stats.leadingCountryNote")}`}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section id="faq" className={styles.section} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.16 }} variants={revealMotion}>
          <div className={styles.container}>
            <SectionHeading kicker={t("faq.kicker")} title={t("faq.title")} />
            <div className={styles.faqList}>
              {faqKeys.map((key) => (
                <FaqItem key={key} question={t(`faq.${key}.question`)} answer={t(`faq.${key}.answer`)} />
              ))}
            </div>
          </div>
          {/* FAQPage structured data — mirrors the Q&A pairs rendered above
              exactly, so it never drifts from what's actually on the page. */}
          <script
            type="application/ld+json"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: faqKeys.map((key) => ({
                  "@type": "Question",
                  name: t(`faq.${key}.question`),
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: t(`faq.${key}.answer`),
                  },
                })),
              }).replace(/</g, "\\u003c"),
            }}
          />
        </motion.section>

        <motion.section id="cta" className={styles.section} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={revealMotion}>
          <div className={styles.container}>
            <div className={styles.ctaPanel}>
              <SectionHeading kicker={t("cta.kicker")} title={t("cta.title")} subtitle={t("cta.description")} />
              <div className={styles.ctaActions}>
                <MemoizedMobileWalletConnector
                  className={styles.heroWalletSlot}
                  buttonClassName={styles.heroWalletSkin}
                  desktopButtonLabel={t("activateLevel")}
                  mobileButtonLabel={t("activateLevel")}
                />
                <a href="https://t.me/ricomatrixdapp" target="_blank" rel="noreferrer" className={styles.secondaryCta}>
                  {t("joinTelegram")}
                </a>
              </div>
              <p className={styles.disclaimer}>{t("cta.disclaimer")}</p>
            </div>
          </div>
        </motion.section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerGrid}>
            <div className={styles.footerBrand}>
              <div className={styles.footerLogoRow}>
                <img src="/logo.png" alt="Rico Matrix" className={styles.footerLogo} />
                <div>
                  <strong>Rico Matrix</strong>
                  <p>{t("support.help")}</p>
                </div>
              </div>
              <span className={styles.footerSupport}>{t("support.team")} {t("support.telegram")}</span>
            </div>

            <div className={styles.footerColumn}>
              <h3>{t("nav.ecosystem")}</h3>
              <div className={styles.footerLinks}>
                {navLinks.map((link) => (
                  <a key={link.id} href={`#${link.id}`}>{link.label}</a>
                ))}
              </div>
            </div>

            <div className={styles.footerColumn}>
              <h3>{t("footer.links.website")}</h3>
              <div className={styles.footerLinks}>
                {footerLinks.map((item) => (
                  <a key={item.label} href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} rel={item.href.startsWith("http") ? "noreferrer" : undefined}>
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.footerBar}>{t("footer.copyright", { year: new Date().getFullYear() })}</div>
        </div>
      </footer>
    </div>
  );
}
