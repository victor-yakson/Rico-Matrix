import type { Metadata } from "next";
import "./globals.css";
import { Web3Provider } from "../providers/Web3Provider";
import { PageTransition } from "@/components/Layout/PageTransition";
import { Toaster } from "sonner";
import { getLocale, getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import VisitTracker from "@/components/Common/VisitTracker";
import WalletCookieSync from "@/components/Common/WalletCookieSync";

export const metadata: Metadata = {
  title: "RicoMatrix - Read • Earn • Own",
  description: "Real Book Chapters on BSC Blockchain",
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
          <div className="theme-background" />
          <NextIntlClientProvider locale={locale} messages={messages}>
            <Web3Provider>
              <Toaster
                position="bottom-right"
                expand={true}
                richColors
                closeButton
              />
              <VisitTracker />
              <WalletCookieSync />
              <PageTransition>{children}</PageTransition>
            </Web3Provider>
          </NextIntlClientProvider>
        </body>
      </html>
    );

}
