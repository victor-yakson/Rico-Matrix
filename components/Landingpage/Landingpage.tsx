"use client";

import React, { useEffect, useState, MouseEvent, useMemo, memo } from "react";
import MobileWalletConnector from "../Common/MobileWalletConnector";

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

const faqItems = [
  {
    question: "Is RICO MATRIX really decentralized?",
    answer: (
      <>
        Yes. RICO MATRIX runs as a self-executing smart contract on the BNB
        Smart Chain. All key rules — registrations, matrix placements, unilevel
        payouts, royalties and RICO coin farming — are encoded on-chain. Once
        deployed, no admin can change the logic or pause your earnings.
      </>
    ),
  },
  {
    question: "How do I actually earn here?",
    answer: (
      <>
        You earn from multiple streams: X3 matrix (direct referrals), X6 matrix
        (spillovers from team and global activity), the 12-level unilevel
        referral program, royalty pools funded by every chapter, and free RICO
        coin farming on buys, upgrades and referrals.
      </>
    ),
  },
  {
    question: "Do I need referrals to earn?",
    answer: (
      <>
        Referrals speed everything up, but are not the only way to earn. The X6
        spillover system can fill slots from upline and global activity.
        However, if you want serious results, we strongly suggest you bring at
        least three active partners and help them reach higher chapters with
        you.
      </>
    ),
  },
  {
    question: "Why is Level 9 recommended at launch?",
    answer: (
      <>
        At launch, most leaders target mid–high chapters to position for global
        spillovers and unilevel volume. Starting at Level 9 (or higher)
        positions you in the core flow of matrix and royalty activity, instead
        of staying at the very bottom while higher chapters explode above you.
      </>
    ),
  },
  {
    question: "Is this financial or investment advice?",
    answer: (
      <>
        No. RICO MATRIX is a decentralized smart contract library system with
        coded rewards. Participation is entirely at your own risk. Always do
        your own research and never spend funds you cannot afford to lose.
      </>
    ),
  },
];

const scrollToId = (id: string) => {
  if (typeof document === "undefined") return;
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

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
      <div className="countdown-label">Launch countdown</div>
      <div className="countdown-grid" id="countdown">
        <div className="countdown-item">
          <div className="countdown-value" id="cd-days">
            {countdown.days}
          </div>
          <div className="countdown-label-small">Days</div>
        </div>
        <div className="countdown-item">
          <div className="countdown-value" id="cd-hours">
            {countdown.hours}
          </div>
          <div className="countdown-label-small">Hours</div>
        </div>
        <div className="countdown-item">
          <div className="countdown-value" id="cd-mins">
            {countdown.mins}
          </div>
          <div className="countdown-label-small">Mins</div>
        </div>
        <div className="countdown-item">
          <div className="countdown-value" id="cd-secs">
            {countdown.secs}
          </div>
          <div className="countdown-label-small">Secs</div>
        </div>
      </div>
      <div className="launch-note">
        Get your wallet ready with USDT BEP-20 before launch to avoid network
        congestion.
      </div>
    </div>
  );
};

const RicoMatrixLandingPage: React.FC = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  const year = new Date().getFullYear();

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
              {/* make sure this image exists in /public */}
              <img
                src="/logo.png"
                alt="RICO MATRIX"
                className="logo-img"
              />
            </div>
          </button>

          <nav className="nav">
            <div className="nav-links" id="nav-links-desktop">
              <a href="#how" onClick={handleNavClick("how")}>
                How it works
              </a>
              <a href="#videos" onClick={handleNavClick("videos")}>
                Videos
              </a>
              <a href="#levels" onClick={handleNavClick("levels")}>
                Levels
              </a>
              <a href="#faq" onClick={handleNavClick("faq")}>
                FAQ
              </a>
            </div>
            <button
              className="nav-cta"
              type="button"
              onClick={() => scrollToId("cta")}
            >
              <span>Activate Level1</span>
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
          </nav>
        </div>

        {mobileNavOpen && (
          <div className="nav-links nav-links--mobile">
            <a href="#how" onClick={handleNavClick("how")}>
              How it works
            </a>
            <a href="#videos" onClick={handleNavClick("videos")}>
              Videos
            </a>
            <a href="#levels" onClick={handleNavClick("levels")}>
              Levels
            </a>
            <a href="#faq" onClick={handleNavClick("faq")}>
              FAQ
            </a>
            <a href="#cta" onClick={handleNavClick("cta")}>
              Activate Level 1
            </a>
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
                  <h1 className="hero-title">
                    The World's First
                    <span className="hero-highlight">
                      Decentralized Library Matrix
                    </span>
                    That Pays Royalty Passive Income.
                  </h1>

                  <p className="hero-subtitle">
                    Buy chapters, unlock knowledge, and earn from a dual-track{" "}
                    <strong>X3 + X6 matrix</strong>, 12 unilevel rewards,
                    royalty pools and free RICO coin farming — all running on a
                    self-executing smart contract on BNB Chain.
                  </p>

                  <div className="hero-ctas mt-6 flex flex-col sm:flex-row items-center md:items-start gap-4 sm:gap-6 lg:gap-8">
                    <MemoizedMobileWalletConnector />

                    <a
                      href="https://t.me/ricomatrix"
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary flex items-center justify-center h-14 px-8 text-lg rounded-xl"
                    >
                      Join Telegram
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
                      X3 + X6 Matrix Overview
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      Chapters = levels • Levels = book chapters you own forever
                    </div>
                  </div>
                  <div className="hero-card-chip">BNB Smart Chain</div>
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
                      12 chapters per track · each next chapter costs 2× more
                      and pays 2× more.
                    </div>
                    <div className="hero-card-matrix">
                      <div className="hero-card-level">
                        <div>Chapter 1</div>
                        <span>$5</span>
                        <small>Entry</small>
                      </div>
                      <div className="hero-card-level">
                        <div>Chapter 4</div>
                        <span>$40</span>
                        <small>Team builder</small>
                      </div>
                      <div className="hero-card-level hero-card-level--highlight">
                        <div>Chapter 9</div>
                        <span>$1280</span>
                        <small>Global spillover zone</small>
                      </div>
                      <div className="hero-card-level">
                        <div>Chapter 10</div>
                        <span>$2560</span>
                        <small>Scaling</small>
                      </div>
                      <div className="hero-card-level">
                        <div>Chapter 11</div>
                        <span>$5120</span>
                        <small>Leaders</small>
                      </div>
                      <div className="hero-card-level">
                        <div>Chapter 12</div>
                        <span>$10240</span>
                        <small>Whales</small>
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
                  <div>
                    <strong>Royalty pool:</strong> 30% for long-term community
                    payouts plus platform fee.
                  </div>
                  <div>
                    <strong>RICO coin farming:</strong> 1:1 free coins on buys,
                    upgrades &amp; unilevel.
                  </div>
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
                      Launching 15 Dec 2025
                    </span>
                    <span>4:00 PM WAT — BNB Smart Chain</span>
                  </div>

                  <div className="hero-badges">
                    <div className="hero-badge">
                      <span className="hero-badge-dot"></span>
                      100% decentralized — smart contract fully renounced
                    </div>
                    <div className="hero-badge">
                      <span className="hero-badge-dot"></span>
                      X3 direct + X6 spillover earnings
                    </div>
                    <div className="hero-badge">
                      <span className="hero-badge-dot"></span>
                      Royalty community pool &amp; unilevel
                    </div>
                  </div>

                  <div className="hero-meta">
                    <div className="hero-meta-pill">
                      Recommended entry: <strong>at least Level 9</strong> for
                      global spillovers
                    </div>
                    <div>
                      Bring <strong>3 ready partners</strong> to activate your
                      engine from day one.
                    </div>
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
                <div className="section-kicker">RICO X3 VISUAL</div>
                <h2 className="section-title">ONE LINE - 3 PLACES</h2>
                <p className="section-subtitle">
                  UNLIMITED AUTOMATIC REINVESTS
                </p>
              </div>
              <div className="image-frame">
                <img
                  src="/ricox3matrixs.png"
                  alt="RICO MATRIX X3 matrix visual"
                />
              </div>
              <div className="image-note">
                The X3 matrix is your direct sales engine. It's a 3-referral
                position matrix where you earn directly from each referral.
              </div>
            </div>
          </div>
        </section>

        {/* WHY PEOPLE ARE JOINING */}
        <section className="section section--tight">
          <div className="container">
            <div className="block-panel">
              <div className="section-head reveal">
                <div className="section-kicker">Why people are joining</div>
                <h2 className="section-title">
                  Multiple on-chain income streams from one library matrix.
                </h2>
                <p className="section-subtitle">
                  RICO MATRIX combines matrix rewards, unilevel commissions,
                  royalty dividends, intellectual property ownership and RICO
                  coin farming — all encoded inside an unstoppable smart
                  contract.
                </p>
              </div>

              <div className="grid grid--3">
                <article className="card reveal">
                  <div className="card-kicker">Spillovers</div>
                  <h3 className="card-title">Earn from global X6 activity</h3>
                  <p className="card-body">
                    The X6 matrix is built for team and community spillovers.
                    Upline, downline and crossline activity can fill your matrix
                    slots, giving you the chance to earn even if you are not a
                    strong recruiter.
                  </p>
                </article>

                <article className="card reveal">
                  <div className="card-kicker">Intellectual property</div>
                  <h3 className="card-title">
                    Every level unlocks a real chapter
                  </h3>
                  <p className="card-body">
                    Each level is a book chapter in the RICO Library. When you
                    buy a chapter, you unlock knowledge and own that content
                    forever — your participation is backed by long-term IP
                    value.
                  </p>
                </article>

                <article className="card reveal">
                  <div className="card-kicker">Royalties &amp; unilevel</div>
                  <h3 className="card-title">
                    Royalty pool + 12-level unilevel
                  </h3>
                  <p className="card-body">
                    Every buy and upgrade feeds royalty and referral pools. 70%
                    of each chapter price flows instantly to 12 uplines on your
                    unilevel, while global 30% royalty pools reward both active
                    and inactive users over time plus platform fee.
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
                <div className="section-kicker">RICO X6 VISUAL</div>
                <h2 className="section-title">TWO LINES - 2 + 4 PLACES</h2>
              </div>
              <div className="image-frame">
                <img
                  src="/ricox6matrix.png"
                  alt="RICO MATRIX X6 matrix visual"
                />
              </div>
              <div className="image-note">
                The X6 matrix operates on a spillover system. It's a 6-position
                matrix that fills through your direct efforts, your upline's
                efforts, and the efforts of your downline. This creates
                potential for passive earning and team-based growth.
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="section">
          <div className="container">
            <div className="block-panel">
              <div className="section-head reveal">
                <div className="section-kicker">How it works</div>
                <h2 className="section-title">
                  Three simple steps to switch on your RICO engine.
                </h2>
                <p className="section-subtitle">
                  RICO MATRIX is a self-executing algorithm on the Binance Smart
                  Chain. Once the contract is live, it automatically handles
                  registrations, matrix placements, reinvestments, unilevel
                  payouts and royalty distributions.
                </p>
              </div>

              <div className="steps">
                <article className="step reveal">
                  <div className="step-index">1</div>
                  <div>
                    <h3 className="step-title">Connect your BEP-20 wallet</h3>
                    <p className="step-body">
                      Use Trust Wallet, SafePal, MetaMask, TokenPocket, OKX, or
                      any compatible BNB Smart Chain wallet. Fund it with a
                      small amount of BNB for gas and at least{" "}
                      <strong>$5 USDT BEP-20</strong> for your first chapter.
                    </p>
                  </div>
                </article>

                <article className="step reveal">
                  <div className="step-index">2</div>
                  <div>
                    <h3 className="step-title">
                      Activate Chapter 1 in X3 &amp; X6
                    </h3>
                    <p className="step-body">
                      With <strong>$5 USDT</strong> you enter RICO X3 and RICO
                      X6 simultaneously. X3 is your direct sales engine (3
                      slots), while X6 is your spillover engine (2+4 slots). All
                      payments move wallet-to-wallet via the smart contract.
                    </p>
                  </div>
                </article>

                <article className="step reveal">
                  <div className="step-index">3</div>
                  <div>
                    <h3 className="step-title">
                      Upgrade, recycle &amp; scale your chapters
                    </h3>
                    <p className="step-body">
                      Chapters 2–12 are each 2× the previous price and 2× the
                      earning potential. Auto-recycle keeps chapters reopening.
                      Unilevel and royalty pools reward network-wide activity,
                      while RICO coin farming drops free tokens based on your
                      buys, upgrades and referrals.
                    </p>
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
                <div className="section-kicker">Video Tutorials Guide</div>
                <h2 className="section-title">
                  Watch these 3 short videos before you join.
                </h2>
                <p className="section-subtitle">
                  These tutorials help new members move from zero to ready:
                  wallet, USDT funding, and how RICO MATRIX works.
                </p>
              </div>

              <div className="video-grid">
                <article className="video-card reveal">
                  <h3 className="video-title">
                    1. How to create a SafePal wallet
                  </h3>
                  <p className="video-desc">
                    Step-by-step guide to install SafePal, create your wallet,
                    secure your seed phrase and connect to BNB Smart Chain.
                  </p>
                  <div className="video-embed">
                    <iframe
                      src="https://www.youtube.com/embed/V0WrNFZlehg"
                      allowFullScreen
                      loading="lazy"
                      title="How to create a SafePal wallet"
                    />
                  </div>
                </article>

                <article className="video-card reveal">
                  <h3 className="video-title">
                    2. How to buy USDT on Bybit P2P
                  </h3>
                  <p className="video-desc">
                    Learn how to use Bybit P2P marketplace to safely convert
                    your local currency into USDT BEP-20.
                  </p>
                  <div className="video-embed">
                    <iframe
                      src="https://www.youtube.com/embed/gqHHsPycihI"
                      allowFullScreen
                      loading="lazy"
                      title="How to buy USDT on Bybit P2P"
                    />
                  </div>
                </article>

                <article className="video-card reveal">
                  <h3 className="video-title">3. How RICO MATRIX works</h3>
                  <p className="video-desc">
                    Overview of X3 &amp; X6, royalty pool, unilevel and RICO
                    coin farming so you understand the full engine.
                  </p>
                  <div className="video-embed">
                    <iframe
                      src="https://www.youtube.com/embed/gqHHsPycihI"
                      allowFullScreen
                      loading="lazy"
                      title="How RICO MATRIX works"
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
                <div className="section-kicker">Strategic partners</div>
                <h2 className="section-title">
                  Trusted by big Web3 infrastructures.
                </h2>
                <p className="section-subtitle">
                  RICO MATRIX interacts with well-known tools in the BNB Smart
                  Chain ecosystem.
                </p>
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
                <div className="section-kicker">12 Unilevel Earning ladder</div>
                <h2 className="section-title">
                  Share 70% of every chapter bought among 12 referral unilevel.
                </h2>
                <p className="section-subtitle">
                  Every chapter purchase instantly rewards your referral tree
                  through the smart contract.
                </p>
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
                  <div className="section-kicker">
                    12 Chapters • X3 &amp; X6
                  </div>
                  <p className="section-subtitle">
                    Both X3 and X6 have 12 identical chapters. Each new chapter
                    costs 2× more than the previous one and pays approximately
                    2× more in matrix profits when filled and recycled.
                  </p>

                  <div
                    className="levels-grid"
                    style={{
                      marginTop: 18,
                    }}
                  >
                    <div className="level-card">
                      <div className="level-label">Level 1</div>
                      <div className="level-price">$5</div>
                      <div className="level-meta">
                        Entry chapter — start your engine.
                      </div>
                    </div>
                    <div className="level-card">
                      <div className="level-label">Level 2</div>
                      <div className="level-price">$10</div>
                      <div className="level-meta">
                        Double your earning capacity.
                      </div>
                    </div>
                    <div className="level-card">
                      <div className="level-label">Level 3</div>
                      <div className="level-price">$20</div>
                      <div className="level-meta">
                        Growing team, growing royalties.
                      </div>
                    </div>
                    <div className="level-card">
                      <div className="level-label">Level 4</div>
                      <div className="level-price">$40</div>
                      <div className="level-meta">
                        More spillovers, larger cycles.
                      </div>
                    </div>
                    <div className="level-card">
                      <div className="level-label">Level 5</div>
                      <div className="level-price">$80</div>
                      <div className="level-meta">Serious builders zone.</div>
                    </div>
                    <div className="level-card">
                      <div className="level-label">Level 6</div>
                      <div className="level-price">$160</div>
                      <div className="level-meta">Core team leadership.</div>
                    </div>
                    <div className="level-card">
                      <div className="level-label">Level 7</div>
                      <div className="level-price">$320</div>
                      <div className="level-meta">
                        Long-term royalty leverage.
                      </div>
                    </div>
                    <div className="level-card">
                      <div className="level-label">Level 8</div>
                      <div className="level-price">$640</div>
                      <div className="level-meta">
                        Momentum and duplication.
                      </div>
                    </div>
                    <div className="level-card level-card--highlight">
                      <div className="level-label">Level 9</div>
                      <div className="level-price">$1,280</div>
                      <div className="level-meta">
                        Global spillover hotspot — strongly recommended.
                      </div>
                    </div>
                    <div className="level-card">
                      <div className="level-label">Level 10</div>
                      <div className="level-price">$2,560</div>
                      <div className="level-meta">
                        Scaling deep unilevel earnings.
                      </div>
                    </div>
                    <div className="level-card">
                      <div className="level-label">Level 11</div>
                      <div className="level-price">$5,120</div>
                      <div className="level-meta">Leadership &amp; whales.</div>
                    </div>
                    <div className="level-card">
                      <div className="level-label">Level 12</div>
                      <div className="level-price">$10,240</div>
                      <div className="level-meta">
                        Flagship chapter — top of the library.
                      </div>
                    </div>
                  </div>

                  <p
                    className="levels-note"
                    style={{
                      marginTop: 14,
                    }}
                  >
                    <strong>Good to know:</strong> Chapters never expire.
                    Auto-recycle re-opens them when filled so you can keep
                    earning. If you don't upgrade, you may lose potential
                    earnings to an upline who already owns the next chapter.
                  </p>
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
                    Why RICO Matrix is different
                  </div>

                  <div className="why-grid">
                    <article className="why-card">
                      <div className="why-tag">Decentralized</div>
                      <h3 className="why-title">
                        100% decentralized smart contract
                      </h3>
                      <p className="why-body">
                        No owner withdrawals, no manual control over funds once
                        live. The rules are locked on-chain.
                      </p>
                    </article>

                    <article className="why-card">
                      <div className="why-tag">Dual-track engine</div>
                      <h3 className="why-title">
                        X3 for directs, X6 for spillovers
                      </h3>
                      <p className="why-body">
                        X3 rewards your personal referrals, while X6 is built
                        for global and team spillovers from the whole community.
                      </p>
                    </article>

                    <article className="why-card">
                      <div className="why-tag">Royalties</div>
                      <h3 className="why-title">Royalty passive income</h3>
                      <p className="why-body">
                        A global pool shares long-term royalties with both
                        active and inactive members based on chapter activity.
                      </p>
                    </article>

                    <article className="why-card">
                      <div className="why-tag">Unilevel</div>
                      <h3 className="why-title">12-level referral program</h3>
                      <p className="why-body">
                        70% of every chapter price is instantly distributed
                        across 12 uplines through the smart contract.
                      </p>
                    </article>

                    <article className="why-card">
                      <div className="why-tag">RICO coin</div>
                      <h3 className="why-title">Free RICO coin farming</h3>
                      <p className="why-body">
                        1:1 RICO drops on every buy, upgrade and unilevel payout
                        build real on-chain token circulation.
                      </p>
                    </article>

                    <article className="why-card">
                      <div className="why-tag">Chapters as IP</div>
                      <h3 className="why-title">Education with real utility</h3>
                      <p className="why-body">
                        Each level unlocks educational content so you're not
                        just earning — you're also building long-term knowledge.
                      </p>
                    </article>
                  </div>
                </div>

                <div className="reveal">
                  <h3 style={{ margin: "0 0 6px" }}>
                    Re-watch the RICO MATRIX overview.
                  </h3>
                  <p
                    style={{
                      margin: "0 0 10px",
                      fontSize: "0.9rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    After watching the three tutorials above, this is where
                    serious builders usually decide what chapter to start from.
                  </p>
                  <div
                    className="video-embed"
                    style={{
                      borderRadius: 18,
                      boxShadow: "0 18px 40px rgba(0,0,0,0.85)",
                    }}
                  >
                    <iframe
                      src="https://www.youtube.com/embed/gqHHsPycihI"
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
                <div className="section-kicker">Earn Free Airdrop</div>
                <p className="section-subtitle">
                  Earn free RICO coins automatically into your crypto wallet
                  based on your buy, upgrade and referral activities inside the
                  RICO MATRIX system.
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
                <div className="section-kicker">FAQ</div>
                <h2 className="section-title">
                  Answers to the most important questions.
                </h2>
              </div>

              <div className="faq-list">
                {faqItems.map((item) => (
                  <RicoMatrixFaqItem
                    key={item.question}
                    question={item.question}
                    answer={item.answer}
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
              <div>Need help getting started or stuck on any step?</div>
              <div>
                Team Support:{" "}
                <strong>
                  <a
                    href="https://t.me/defilordly"
                    target="_blank"
                    rel="noreferrer"
                  >
                    @ricomatrix
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
              <h2>Ready to switch on your RICO Engine?</h2>
              <p>
                Get your wallet ready with USDT BEP-20, start at Chapter&nbsp;1
                — or position higher up to Chapter&nbsp;9 and above — and bring
                at least three serious partners. The RICO MATRIX smart contract
                will handle the rest.
              </p>

              <div className="hero-ctas mt-6 flex flex-col sm:flex-row items-center md:items-start gap-4 sm:gap-6 lg:gap-8">
                <MemoizedMobileWalletConnector />

                <a
                  href="https://t.me/ricomatrix"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary flex items-center justify-center h-14 px-8 text-lg rounded-xl"
                >
                  Join Telegram
                </a>
              </div>
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                }}
              >
                Reminder: This is not investment advice. Always do your own
                research before interacting with any smart contract or DeFi
                system.
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div>
            © <span>{year}</span> RICO MATRIX. All rights reserved.
          </div>
          <div className="footer-links">
            <a href="https://ricomatrix.com/" target="_blank" rel="noreferrer">
              ricomatrix.com
            </a>
            <a
              href="https://t.me/ricomatrixdapp"
              target="_blank"
              rel="noreferrer"
            >
              Telegram
            </a>
            <a
              href="https://x.com/ricomatrixdapp"
              target="_blank"
              rel="noreferrer"
            >
              X (Twitter)
            </a>
            <a
              href="https://www.youtube.com/@ricomatrix"
              target="_blank"
              rel="noreferrer"
            >
              YouTube Channel
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default RicoMatrixLandingPage;