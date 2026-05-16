import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ToastHandler } from "@/components/ui/ToastHandler";

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

export const metadata: Metadata = {
  title: {
    default: "UnifData – Unified Business Data. Clearer Decisions.",
    template: "%s | UnifData",
  },
  description:
    "UnifData organizes customers, jobs, follow-ups, and revenue into one industry-aware workspace. Unified business data for home services, contractors, medical offices, and local businesses.",
  keywords: [
    "CRM for local business",
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
    statusBarStyle: "default",
    title: "UnifData",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "theme-color": "#1D2D3E",
  },
  icons: {
    icon: "/unifdata-mark.svg",
  },
  openGraph: {
    title: "UnifData – Unified Business Data. Clearer Decisions.",
    description:
      "Organize your customers, jobs, follow-ups, and revenue into one clean workspace. Industry-aware CRM built for local businesses.",
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
    "Industry-aware CRM and data management for local businesses. Organize customers, jobs, follow-ups, and revenue in one workspace.",
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
              __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
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
          <Toaster position="bottom-right" richColors />
          <ToastHandler />
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
