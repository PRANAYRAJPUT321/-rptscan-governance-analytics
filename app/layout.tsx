import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "RPTScan — Related Party Disclosure Study",
  description:
    "AI extraction of related party transaction notes under SEBI LODR, scaled to revenue and net worth, scored for disclosure quality and linked to governance outcomes for 100 NSE companies.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const built = process.env.NEXT_PUBLIC_BUILD_TIME;
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen font-sans">
        <Nav />
        <main className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">{children}</main>
        <footer className="border-t border-white/5 py-6 text-center text-xs text-slate-500">
          RPTScan · AI in Finance project · Topic: Disclosure Quality and Governance Outcomes
          <span className="mx-2">·</span>
          build {process.env.NEXT_PUBLIC_COMMIT} {built ? `· ${new Date(built).toUTCString()}` : ""}
        </footer>
      </body>
    </html>
  );
}
