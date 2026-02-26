import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/lib/providers";

export const metadata: Metadata = {
  title: "PlaceAI – AI Intelligent Placement & Interview Platform",
  description: "Bridge the gap between coding practice and real-world placement readiness with AI-driven interview simulations, human expert mock interviews, and adaptive aptitude analytics.",
  keywords: "interview preparation, AI interview, placement platform, aptitude test, mock interview, DSA practice",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
