import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vmake Creator Program",
  description: "Creator reward programme management for Vmake.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
