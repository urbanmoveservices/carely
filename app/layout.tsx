import type { Metadata, Viewport } from "next";

import { AuthProvider } from "@/components/AuthProvider";

import { I18nProvider } from "@/components/I18nProvider";

import { PreferencesProvider } from "@/components/PreferencesProvider";

import { PWARegister } from "@/components/PWARegister";

import { PageTranslator } from "@/components/translation/PageTranslator";

import { TranslationBanner } from "@/components/translation/TranslationBanner";

import { ToastProvider } from "@/components/ui/ToastProvider";

import { LanguageReactiveBoundary } from "@/components/LanguageReactiveBoundary";
import { FloatingChatButton } from "@/components/chat/FloatingChatButton";

import { BRAND } from "@/lib/brand";
import { absoluteUrl, getAppUrl } from "@/lib/app-url";

import "./globals.css";

const appUrl = getAppUrl();

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: `${BRAND.name} — Family Health Reports & Insights`,
    template: `%s | ${BRAND.name}`,
  },

  description: BRAND.description,

  keywords: [
    "medical report summary",
    "lab report AI",
    "family health",
    "health dashboard India",
    "Vaidya GPT",
  ],

  openGraph: {
    title: BRAND.name,
    description: BRAND.description,
    url: appUrl,
    siteName: BRAND.name,
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: absoluteUrl("/brand/logo.png"),
        width: 512,
        height: 512,
        alt: BRAND.logoAlt,
      },
    ],
  },

  twitter: {
    card: "summary",
    title: BRAND.name,
    description: BRAND.description,
    images: [absoluteUrl("/brand/logo.png")],
  },

  robots: { index: true, follow: true },

  manifest: "/manifest.webmanifest",

  appleWebApp: {

    capable: true,

    title: BRAND.shortName,

    statusBarStyle: "default",

  },

  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

};



export const viewport: Viewport = {

  width: "device-width",

  initialScale: 1,

  maximumScale: 1,

  viewportFit: "cover",

  themeColor: "#0f766e",

};



export default function RootLayout({

  children,

}: {

  children: React.ReactNode;

}) {

  return (

    <html lang="en" suppressHydrationWarning>

      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">

        <AuthProvider>

          <I18nProvider>

            <PreferencesProvider>

              <ToastProvider>

                <TranslationBanner />

                <PageTranslator />

                <LanguageReactiveBoundary>{children}</LanguageReactiveBoundary>

                <FloatingChatButton />

                <PWARegister />

              </ToastProvider>

            </PreferencesProvider>

          </I18nProvider>

        </AuthProvider>

      </body>

    </html>

  );

}

