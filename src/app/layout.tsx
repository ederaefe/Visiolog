import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { PWAProvider } from "@/components/pwa-provider";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { Toaster } from "@/components/ui/sonner";
import { FloatingScanFabWrapper } from "@/components/workspace/floating-scan-fab-wrapper";
import { brandingConfig } from "@/config/branding";
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#282828" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://Visiolog.vercel.app'),
  title: `${brandingConfig.name} - ${brandingConfig.titleSuffix}`,
  description: brandingConfig.description,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: brandingConfig.name,
  },
  icons: {
    icon: [
      { url: '/icon', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" type="image/png" href="/icon?v=2.0.0" />
        <link rel="shortcut icon" href="/icon?v=2.0.0" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-icon?v=2.0.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground transition-colors duration-200">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <PWAProvider>
            <div className="flex-1 flex flex-col">
              {children}
            </div>
            <FloatingScanFabWrapper />
            <PWAInstallPrompt />
            <Toaster duration={3000} />
          </PWAProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
