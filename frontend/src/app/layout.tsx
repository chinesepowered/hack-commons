import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentCommerce | Multi-Agent Economy on Solana",
  description: "AI agents discover, negotiate, and pay each other on-chain — governed by verified humans.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
