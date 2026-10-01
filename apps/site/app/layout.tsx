import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const SITE = process.env.NEXT_PUBLIC_SITE_URL!;
const DESCRIPTION = "Six isometric line figures that answer the pointer. SVG, no dependencies, for React and for everything else.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "hairline",
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { title: "hairline", description: DESCRIPTION, url: "/", siteName: "hairline", type: "website", images: [{ url: "/og.png", width: 1200, height: 630, alt: "The six hairline figures on a board." }] },
  twitter: { card: "summary_large_image", title: "hairline", description: DESCRIPTION, images: ["/og.png"], creator: "@lucasmarkes" },
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
