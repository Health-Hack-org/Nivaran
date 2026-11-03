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
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        {/* Instant inline theme initialization before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('nivaran_theme');
                  var isDark = saved === 'dark';
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                  } else {
                    document.documentElement.classList.add('light');
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
