import type { Metadata } from "next";
import Script from "next/script";
import { Figtree, Noto_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";

// Headings: Figtree. Body and interface text: Noto Sans.
const figtree = Figtree({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-heading",
  display: "swap",
});

const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DLSU CPS Management System",
  description: "Campus Counseling & Psychology Services management portal",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DLSU CPS",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();` }} />
        {/* Design tokens — injected directly so they are immune to Turbopack cache issues */}
        <style dangerouslySetInnerHTML={{ __html: `
:root{
  --color-primary:#2352CC;--color-primary-hover:#1A3DB0;--color-primary-surface:#EBF0FF;
  --color-primary-text:#2352CC;--color-primary-muted:rgba(35,82,204,0.12);
  --color-bg:#F5F7FB;--color-surface:#FFFFFF;--color-sidebar:#0F1729;
  --color-border:#E4E7F0;--color-border-strong:#CBD0DC;
  --color-text-primary:#0D1526;--color-text-secondary:#475569;--color-text-muted:#6B7280;
  --color-success:#059669;--color-success-hover:#047857;--color-success-surface:#ECFDF5;--color-success-text:#065F46;
  --color-warning:#D97706;--color-warning-surface:#FFFBEB;--color-warning-text:#92400E;
  --color-danger:#DC2626;--color-danger-hover:#B91C1C;--color-danger-surface:#FEF2F2;--color-danger-text:#991B1B;
  --color-info:#2563EB;--color-info-surface:#EFF6FF;--color-info-text:#1E40AF;
  --shadow-card:0 1px 3px 0 rgba(13,21,38,0.06),0 1px 2px -1px rgba(13,21,38,0.04);
  --shadow-card-md:0 4px 6px -1px rgba(13,21,38,0.07),0 2px 4px -2px rgba(13,21,38,0.05);
  --shadow-card-lg:0 10px 15px -3px rgba(13,21,38,0.08),0 4px 6px -4px rgba(13,21,38,0.05);
  --shadow-primary:0 0 0 3px rgba(35,82,204,0.15);
  --shadow-modal:0 20px 25px -5px rgba(13,21,38,0.12),0 8px 10px -6px rgba(13,21,38,0.08);
  --background:#FFFFFF;--foreground:#0D1526;
}
html{font-size:106.25%}
html.dark{
  --color-primary:#4575F0;--color-primary-hover:#3465E0;--color-primary-surface:#0D1A40;
  --color-primary-text:#7BAAF7;--color-primary-muted:rgba(69,117,240,0.15);
  --color-bg:#0A0D14;--color-surface:#111827;--color-sidebar:#070B14;
  --color-border:#1F2640;--color-border-strong:#2D3852;
  --color-text-primary:#F1F5F9;--color-text-secondary:#CBD5E1;--color-text-muted:#94A3B8;
  --color-success-surface:#022C22;--color-success-text:#34D399;
  --color-warning-surface:#1C1400;--color-warning-text:#FCD34D;
  --color-danger-surface:#1F0708;--color-danger-text:#FCA5A5;
  --color-info-surface:#0C1A2E;--color-info-text:#93C5FD;
  --shadow-card:0 1px 3px 0 rgba(0,0,0,0.3),0 1px 2px -1px rgba(0,0,0,0.2);
  --shadow-card-md:0 4px 6px -1px rgba(0,0,0,0.35),0 2px 4px -2px rgba(0,0,0,0.2);
  --shadow-card-lg:0 10px 15px -3px rgba(0,0,0,0.4),0 4px 6px -4px rgba(0,0,0,0.25);
  --shadow-modal:0 20px 25px -5px rgba(0,0,0,0.5),0 8px 10px -6px rgba(0,0,0,0.35);
  --background:#0A0D14;--foreground:#F1F5F9;
}
        ` }} />
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"
          strategy="beforeInteractive"
        />
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(e){console.warn('SW registration failed:',e);});});}}` }} />
        <meta name="theme-color" content="#2352CC" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="DLSU CPS" />
        <link rel="apple-touch-icon" href="/cps-logo.png" />
      </head>
      <body className={`${figtree.variable} ${notoSans.variable} antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
