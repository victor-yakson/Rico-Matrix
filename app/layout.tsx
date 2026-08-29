import type { Metadata } from "next";
import "./globals.css";
import { Web3Provider } from "../providers/Web3Provider";
import { PageTransition } from "@/components/Layout/PageTransition";
import { Toaster } from "sonner";
import { getLocale, getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import VisitTracker from "@/components/Common/VisitTracker";
import WalletCookieSync from "@/components/Common/WalletCookieSync";
import NetworkShowcase from "@/components/Common/NetworkShowcase";

const SITE_URL = "https://ricomatrix.com";
const SITE_DESCRIPTION =
  "RicoMatrix is a Learn-to-Earn Web3 platform: buy chapter-based book access on-chain (BNB Smart Chain, Ethereum, Base, Polygon), earn $RICO rewards, royalties, and staking yield, and unlock publishing and skills training as you progress.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "RicoMatrix - Read • Earn • Own",
    template: "%s | RicoMatrix",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "RicoMatrix",
    title: "RicoMatrix - Read • Earn • Own",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [{ url: "/logo.png" }],
  },
  twitter: {
    card: "summary",
    title: "RicoMatrix - Read • Earn • Own",
    description: SITE_DESCRIPTION,
    images: ["/logo.png"],
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "RicoMatrix",
  alternateName: "Rico Matrix",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description: SITE_DESCRIPTION,
  sameAs: [
    "https://t.me/ricomatrixdapp",
    "https://x.com/rmdapp",
    "https://www.youtube.com/@ricomatrix",
    "https://tiktok.com/@ricomatrix",
  ],
};

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "RicoMatrix",
  applicationCategory: "BlockchainApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "USD",
    lowPrice: "5",
    highPrice: "10240",
    offerCount: "12",
  },
  featureList: [
    "Chapter-based Learn-to-Earn book access (X3 and X6 tracks, 12 chapters each)",
    "$RICO native reward token, farmed automatically on purchases, upgrades, and referrals",
    "Royalty pool: 70% of each chapter price to a 12-level unilevel program, 30% to a global royalty pool",
    "RICO staking with fixed-term plans (30/180/365 days)",
    "Multi-chain access sync across BNB Smart Chain, Ethereum, Base, and Polygon",
    "Rico Quant Bot — a connected crypto trading product at app.ricomatrix.com",
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    // Await the async functions
    const locale = await getLocale();
    const messages = await getMessages();

    return (
      <html lang={locale} style={{ backgroundColor: "#070707" }}>
        <body
          className="theme-app min-h-screen text-slate-50 relative"
          style={{ backgroundColor: "#070707" }}
        >
          <script
            type="application/ld+json"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
            }}
          />
          <script
            type="application/ld+json"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(softwareApplicationJsonLd).replace(/</g, "\\u003c"),
            }}
          />
          <div className="theme-background" />
          <NextIntlClientProvider locale={locale} messages={messages}>
            <Web3Provider>
              <Toaster
                position="top-center"
                expand={true}
                richColors
                closeButton
              />
              <VisitTracker />
              <WalletCookieSync />
              <NetworkShowcase />
              <PageTransition>{children}</PageTransition>
            </Web3Provider>
          </NextIntlClientProvider>
        </body>
      </html>
    );

}
