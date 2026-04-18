import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Market Pulse — Real-Time Stock Intelligence",
  description:
    "AI-powered stock market tracker with real-time prices, ML-based predictions, and sentiment analysis for smarter investing.",
  keywords: ["stock market", "real-time", "AI prediction", "stock tracker", "sentiment analysis"],
  openGraph: {
    title: "Market Pulse",
    description: "AI-powered real-time stock intelligence platform",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
