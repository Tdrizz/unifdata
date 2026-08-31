import type { MetadataRoute } from "next";

// Next.js App Router convention -- this function is automatically served at
// /sitemap.xml. Lists only the public marketing pages (the same set
// robots.txt already allows), each with its canonical path.
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.unifdata.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/pricing", changeFrequency: "monthly", priority: 0.9 },
    { path: "/preview", changeFrequency: "monthly", priority: 0.8 },
    { path: "/docs", changeFrequency: "monthly", priority: 0.7 },
    { path: "/waitlist", changeFrequency: "monthly", priority: 0.6 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  ];

  return pages.map(({ path, changeFrequency, priority }) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
