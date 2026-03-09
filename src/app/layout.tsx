import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HitIT Live",
  description: "Live padel match streaming",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
