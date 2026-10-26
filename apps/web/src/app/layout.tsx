import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NIVARAN – Mind-Growth & Addiction Recovery",
  description: "Clinical-grade adaptive recovery sanctuary by THE HEXA-GRAMS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F8F7F4] text-[#2D221A] antialiased selection:bg-[#8C6A4F]/20 selection:text-[#8C6A4F]">
        {children}
      </body>
    </html>
  );
}
