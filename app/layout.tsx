import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Claudia’s lens — Marketing intelligence",
  description: "Evidence-backed marketing analysis for every stakeholder.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}


