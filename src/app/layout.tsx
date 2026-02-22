import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lumen Path | Healing + Awakening",
  description:
    "A premium, human-guided healing and awakening experience for chronic illness.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
