import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vmake Creator Portal",
  description: "Creator submission portal and admin operations for the Vmake Creator Program.",
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
