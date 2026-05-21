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
  },
  icons: {
    icon: "/unifdata-mark.svg",
    apple: "/icons/icon-192.png",
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
