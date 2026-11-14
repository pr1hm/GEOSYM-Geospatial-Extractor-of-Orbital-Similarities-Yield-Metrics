import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TAVME: Terrestrial Analog Vector Matching Engine | 2026 NASA Space Apps Challenge",
  description: "TAVME: Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars via Microsoft Planetary Computer STAC and Real-Time ML Similarity Engine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-space-950 text-slate-100 min-h-screen selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}

