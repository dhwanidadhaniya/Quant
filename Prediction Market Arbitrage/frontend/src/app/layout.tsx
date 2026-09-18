import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "Prediction Market Arbitrage Terminal | Market Microstructure Research",
  description: "Researching price discrepancies, arbitrage, liquidity and market efficiency across prediction market venues. A quantitative finance research platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="aurora-bg" />
        <Sidebar />
        <main className="main-content relative z-10">
          {children}
        </main>
      </body>
    </html>
  );
}
