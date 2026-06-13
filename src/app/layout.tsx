import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Rota Manager — Visit Belfast CWA",
  description:
    "Cruise Welcome Ambassador rostering system for Visit Belfast cruise operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB" className={`${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-vb-bg text-vb-text">
        {children}
      </body>
    </html>
  );
}
