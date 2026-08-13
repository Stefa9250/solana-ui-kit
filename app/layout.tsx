import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/site";
import { CommandPalette } from "@/components/docs/command-palette";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const TITLE = "Signet - the missing UX layer for Solana dApps";
const DESCRIPTION =
  "Copy-paste React components for the moments after the click: transaction status, signing review, wallet connect, fees, and error states. Dark-mode first, accessible, MIT.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · Signet",
  },
  description: DESCRIPTION,
  keywords: [
    "signet",
    "signet ui",
    "solana",
    "solana ui kit",
    "web3 components",
    "react",
    "shadcn",
    "wallet adapter",
    "connect wallet",
    "transaction status",
    "sign in with solana",
    "dApp UX",
    "copy-paste components",
  ],
  applicationName: "Signet",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Signet",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

// viewportFit: "cover" lets components pad against env(safe-area-inset-*) so
// fixed overlays clear the notch and home indicator inside wallet webviews.
export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <CommandPalette />
      </body>
    </html>
  );
}
