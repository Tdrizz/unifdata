import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ToastHandler } from "@/components/ui/ToastHandler";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f3f0" },
    { media: "(prefers-color-scheme: dark)", color: "#090e1a" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "UnifData – Unified Business Data. Clearer Decisions.",
    template: "%s | UnifData",
  },
  description:
    "UnifData organizes customers, jobs, follow-ups, and revenue into one industry-aware workspace. Unified business data for home services, contractors, medical offices, and service businesses.",
  keywords: [
    "CRM for service businesses",
    "small business CRM",
    "field service management",
    "business data management",
    "home services CRM",
    "contractor CRM",
    "follow-up management",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "UnifData",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "UnifData",
  },
  icons: {
    icon: "/unifdata-mark.svg",
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  openGraph: {
    title: "UnifData – Unified Business Data. Clearer Decisions.",
    description:
      "Organize your customers, jobs, follow-ups, and revenue into one clean workspace. Industry-aware CRM built for service businesses.",
    siteName: "UnifData",
    type: "website",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "UnifData",
  applicationCategory: "BusinessApplication",
  description:
    "Industry-aware CRM and data management for service businesses. Organize customers, jobs, follow-ups, and revenue in one workspace.",
  operatingSystem: "Web",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl="/"
    >
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
        suppressHydrationWarning
      >
        <head>
          {/* Apply dark class before first paint to prevent flash */}
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})()`,
            }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(organizationSchema),
            }}
          />
          {/* iOS splash screens */}
          <link rel="apple-touch-startup-image" media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: light)" href="/icons/splash/iphone-se-light.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: dark)" href="/icons/splash/iphone-se-dark.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: light)" href="/icons/splash/iphone-8-light.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: dark)" href="/icons/splash/iphone-8-dark.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: light)" href="/icons/splash/iphone-8-plus-light.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: dark)" href="/icons/splash/iphone-8-plus-dark.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: light)" href="/icons/splash/iphone-x-light.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: dark)" href="/icons/splash/iphone-x-dark.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: light)" href="/icons/splash/iphone-xr-light.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: dark)" href="/icons/splash/iphone-xr-dark.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: light)" href="/icons/splash/iphone-xs-max-light.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: dark)" href="/icons/splash/iphone-xs-max-dark.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 360px) and (device-height: 780px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: light)" href="/icons/splash/iphone-12-mini-light.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 360px) and (device-height: 780px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: dark)" href="/icons/splash/iphone-12-mini-dark.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: light)" href="/icons/splash/iphone-12-light.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: dark)" href="/icons/splash/iphone-12-dark.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: light)" href="/icons/splash/iphone-12-pro-max-light.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: dark)" href="/icons/splash/iphone-12-pro-max-dark.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: light)" href="/icons/splash/iphone-14-light.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: dark)" href="/icons/splash/iphone-14-dark.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: light)" href="/icons/splash/iphone-14-plus-light.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: dark)" href="/icons/splash/iphone-14-plus-dark.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: light)" href="/icons/splash/iphone-14-pro-light.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: dark)" href="/icons/splash/iphone-14-pro-dark.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: light)" href="/icons/splash/iphone-14-pro-max-light.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: dark)" href="/icons/splash/iphone-14-pro-max-dark.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: light)" href="/icons/splash/iphone-15-light.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: dark)" href="/icons/splash/iphone-15-dark.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: light)" href="/icons/splash/iphone-15-pro-max-light.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: dark)" href="/icons/splash/iphone-15-pro-max-dark.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: light)" href="/icons/splash/ipad-mini-light.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: dark)" href="/icons/splash/ipad-mini-dark.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: light)" href="/icons/splash/ipad-air-light.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: dark)" href="/icons/splash/ipad-air-dark.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: light)" href="/icons/splash/ipad-pro-11-light.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: dark)" href="/icons/splash/ipad-pro-11-dark.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: light)" href="/icons/splash/ipad-pro-12-light.png" />
          <link rel="apple-touch-startup-image" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: dark)" href="/icons/splash/ipad-pro-12-dark.png" />
        </head>
        <body className="min-h-full flex flex-col">
          {children}
          <Toaster
            position="bottom-right"
            richColors
            offset={16}
            gap={8}
            toastOptions={{
              style: {
                borderRadius: "12px",
                fontSize: "13.5px",
                fontFamily: "var(--font-geist-sans)",
                letterSpacing: "-0.005em",
              },
            }}
          />
          <ToastHandler />
          <Analytics />
          <script
            dangerouslySetInnerHTML={{
              __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js');});}`,
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
