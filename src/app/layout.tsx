import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/hooks/use-theme";
import { ThemedToaster } from "@/components/themed-toaster";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { SplashRemover } from "@/components/splash-remover";
import {
  DEFAULT_MODE,
  DEFAULT_THEME,
  MODE_STORAGE_KEY,
  MODES,
  STORAGE_KEY,
  THEME_IDS,
} from "@/lib/themes";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CodixIA",
    template: "%s — CodixIA",
  },
  description: "Self-hostable CRM template for WhatsApp.",
  applicationName: "CodixIA",
  icons: {
    icon: [{ url: "/icon" }],
    apple: [
      { url: "/icon-192.png", sizes: "192x192" },
      { url: "/icon-512.png", sizes: "512x512" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "CodixIA",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#020617" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
  colorScheme: "dark light",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

const THEME_BOOT_SCRIPT = `
(function(){
  var d = document.documentElement;
  try {
    var THEME_KEY = ${JSON.stringify(STORAGE_KEY)};
    var THEME_DEFAULT = ${JSON.stringify(DEFAULT_THEME)};
    var THEMES = ${JSON.stringify(THEME_IDS)};
    var savedTheme = localStorage.getItem(THEME_KEY);
    d.dataset.theme = THEMES.indexOf(savedTheme) !== -1 ? savedTheme : THEME_DEFAULT;

    var MODE_KEY = ${JSON.stringify(MODE_STORAGE_KEY)};
    var MODE_DEFAULT = ${JSON.stringify(DEFAULT_MODE)};
    var MODES = ${JSON.stringify(MODES)};
    var savedMode = localStorage.getItem(MODE_KEY);
    d.dataset.mode = MODES.indexOf(savedMode) !== -1 ? savedMode : MODE_DEFAULT;
  } catch (_e) {
    d.dataset.theme = ${JSON.stringify(DEFAULT_THEME)};
    d.dataset.mode = ${JSON.stringify(DEFAULT_MODE)};
  }
})();
`;

const APPLE_SPLASH_SCREENS = [
  '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)',
  '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)',
  '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)',
  '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)',
  '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)',
  '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)',
  '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)',
  '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)',
  '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)',
] as const

const APPLE_SPLASH_SIZES = [
  '640x1136',
  '750x1334',
  '1242x2208',
  '1125x2436',
  '828x1792',
  '1170x2532',
  '1284x2778',
  '1536x2048',
  '2048x2732',
] as const

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      data-theme={DEFAULT_THEME}
      data-mode={DEFAULT_MODE}
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script
          id="theme-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }}
        />
        <meta name="apple-mobile-web-app-title" content="CodixIA" />
        {APPLE_SPLASH_SCREENS.map((media, i) => (
          <link
            key={`splash-${i}`}
            rel="apple-touch-startup-image"
            media={`${media}`}
            href={`/splash-${APPLE_SPLASH_SIZES[i]}.png`}
          />
        ))}
      </head>
      <body className="min-h-full bg-background text-foreground font-sans">
        {/* Splash bridge: visible until React hydrates, then fades out */}
        <div id="app-splash" aria-hidden="true">
          <div className="splash-logo">
            <svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
              <rect width="500" height="500" fill="#0D7BEA" rx="80" />
              <text x="70" y="285" font-family="Arial, Helvetica, sans-serif" font-size="88" font-weight="700" fill="#FFFFFF">Codix</text>
              <text x="340" y="285" font-family="Arial, Helvetica, sans-serif" font-size="88" font-weight="700" fill="#E11B22">IA</text>
            </svg>
            <span className="splash-brand">WhatsApp CRM</span>
          </div>
        </div>

        <NextIntlClientProvider messages={messages} locale={locale}>
          <ThemeProvider>
            {children}
            <ThemedToaster />
            <PwaInstallPrompt />
            <SplashRemover />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
