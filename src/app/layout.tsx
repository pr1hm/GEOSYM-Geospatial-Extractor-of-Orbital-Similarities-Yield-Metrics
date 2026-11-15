import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GEOSYM: Geospatial Extractor of Orbital Similarities & Yield Metrics | 2026 NASA Space Apps Challenge",
  description: "GEOSYM: Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars via Microsoft Planetary Computer STAC and Real-Time ML Similarity Engine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg text-ink min-h-screen selection:bg-accent/30 selection:text-ink">
        {children}
      </body>
    </html>
  );
}

