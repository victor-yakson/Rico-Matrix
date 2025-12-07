import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "../providers/Web3Provider";
import { PageTransition } from "@/components/Layout/PageTransition";
import { AutoConnectOnLoad } from "@/components/Common/AutoConnectOnLoad";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RicoMatrix - Read • Earn • Own",
  description: "Real Book Chapters on BSC Blockchain",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} min-h-screen bg-gradient-to-b from-slate-950 via-black to-black text-slate-50 relative`}
      >
        {/* Premium gold glow */}
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.10),_transparent_55%)]" />

        <Web3Provider>
          <Toaster
            position="bottom-right"
            expand={true}
            richColors
            closeButton
          />

          <PageTransition>{children}</PageTransition>
        </Web3Provider>
      </body>
    </html>
  );
}
