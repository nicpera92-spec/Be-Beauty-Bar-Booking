import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import ColorThemeProvider from "@/components/ColorThemeProvider";
import Footer from "@/components/Footer";
import { getSavedTheme } from "@/lib/getSavedTheme";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bbbar.co.uk";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "Be Beauty Bar | Nails, Lashes & Permanent Makeup",
  description:
    "Book nails, lash extensions and permanent makeup at Be Beauty Bar. Reserve your slot and secure with a deposit.",
  openGraph: {
    title: "Be Beauty Bar | Book Online",
    description:
      "Book nails, lash extensions and permanent makeup. Reserve your slot and secure with a deposit.",
    url: appUrl,
    siteName: "Be Beauty Bar",
    type: "website",
    locale: "en_GB",
  },
  twitter: {
    card: "summary",
    title: "Be Beauty Bar | Book Online",
    description:
      "Book nails, lash extensions and permanent makeup. Reserve your slot and secure with a deposit.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { cssVars: themeStyle, surface: themeSurface } = await getSavedTheme();

  return (
    <html
      lang="en"
      className={`${playfair.variable} ${dmSans.variable}`}
      style={themeStyle}
      data-theme-surface={themeSurface}
    >
      <body className="font-sans min-h-screen flex flex-col antialiased">
        <ColorThemeProvider />
        <main className="flex flex-1 flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
