import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "FrontierOps – CRM & Data Management for Local Businesses",
    template: "%s | FrontierOps",
  },
  description:
    "FrontierOps organizes customers, jobs, follow-ups, and revenue into one industry-aware workspace. Built for home services, contractors, medical offices, and local businesses.",
  keywords: [
    "CRM for local business",
    "small business CRM",
    "field service management",
    "business data management",
    "home services CRM",
    "contractor CRM",
    "follow-up management",
  ],
  icons: {
    icon: "/frontierops-mark.svg",
  },
  openGraph: {
    title: "FrontierOps – CRM & Data Management for Local Businesses",
    description:
      "Organize your customers, jobs, follow-ups, and revenue into one clean workspace. Industry-aware CRM built for local businesses.",
    siteName: "FrontierOps",
    type: "website",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "FrontierOps",
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
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
