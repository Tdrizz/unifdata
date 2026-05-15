# Phase G: PWA & Mobile Install Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make FrontierOps installable as a Progressive Web App on iOS and Android so field technicians can add it to their home screen and use it with a native app feel.

**Architecture:** Add a `manifest.json` with app metadata and icons, wire `<link rel="manifest">` in the root layout, add Apple-specific meta tags for iOS install, and create a minimal service worker for offline fallback on the shell. No complex caching strategy — just install-ability.

**Tech Stack:** Next.js App Router root layout, Web App Manifest, Service Worker (minimal), TypeScript

---

### Task 1: Web App Manifest

**Goal:** Create `public/manifest.json` with correct PWA metadata so browsers offer "Add to Home Screen."

**Files:**
- Create: `public/manifest.json`
- Create: `public/icons/icon-192.png` placeholder reference (user must supply actual icons)
- Modify: `src/app/layout.tsx` to add `<link rel="manifest">` and Apple meta tags

**Acceptance Criteria:**
- [ ] `public/manifest.json` exists with `name`, `short_name`, `start_url`, `display`, `background_color`, `theme_color`, `icons`
- [ ] Root layout has `<link rel="manifest" href="/manifest.json" />`
- [ ] Root layout has `<meta name="apple-mobile-web-app-capable" content="yes" />`
- [ ] Root layout has `<meta name="apple-mobile-web-app-status-bar-style" content="default" />`
- [ ] Root layout has `<meta name="apple-mobile-web-app-title" content="FrontierOps" />`
- [ ] Chrome DevTools Application → Manifest panel shows no errors

**Verify:** Open Chrome DevTools → Application → Manifest → all fields populated, no warnings.

**Steps:**

- [ ] **Step 1: Read the current root layout**

```bash
cat src/app/layout.tsx
```

- [ ] **Step 2: Create `public/manifest.json`**

```json
{
  "name": "FrontierOps",
  "short_name": "FrontierOps",
  "description": "Business management for field service teams",
  "start_url": "/workspace",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

- [ ] **Step 3: Add manifest link and Apple meta tags to root layout**

In `src/app/layout.tsx`, inside the `<head>` (or via the Next.js `metadata` export):

If the layout uses Next.js `metadata` export, add to `metadata`:

```typescript
export const metadata: Metadata = {
  // ...existing metadata
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FrontierOps",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};
```

If the layout renders `<head>` manually, add these tags directly:

```tsx
<link rel="manifest" href="/manifest.json" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="FrontierOps" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="theme-color" content="#000000" />
```

- [ ] **Step 4: Create placeholder icon files (1×1 pixel PNGs) so the manifest doesn't 404**

```bash
mkdir -p public/icons
# Create minimal 1x1 PNG placeholder
python3 -c "
import base64, os
# minimal 1x1 black PNG
png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJgQQ==')
os.makedirs('public/icons', exist_ok=True)
open('public/icons/icon-192.png', 'wb').write(png)
open('public/icons/icon-512.png', 'wb').write(png)
print('Created placeholder icons')
"
```

Note: The user should replace these with actual branded icons (192×192 and 512×512 PNG).

- [ ] **Step 5: Commit**

```bash
git add public/manifest.json public/icons/ src/app/layout.tsx
git commit -m "feat: add PWA manifest and Apple meta tags for home screen install"
```

---

### Task 2: Minimal service worker for install-ability

**Goal:** Register a minimal service worker so the browser considers the app "installable" and shows the Add to Home Screen prompt on Android. The service worker only caches the app shell — no complex offline logic.

**Files:**
- Create: `public/sw.js`
- Modify: `src/app/layout.tsx` to register the service worker

**Acceptance Criteria:**
- [ ] `public/sw.js` exists and handles `install` and `fetch` events
- [ ] Service worker registration script is injected in the root layout
- [ ] Chrome DevTools → Application → Service Workers shows the worker as "activated and is running"
- [ ] Android Chrome shows "Add to Home Screen" prompt after second visit

**Verify:** Open Chrome DevTools → Application → Service Workers → worker is registered and active.

**Steps:**

- [ ] **Step 1: Create `public/sw.js`**

```javascript
const CACHE_NAME = "frontierops-shell-v1";
const SHELL_URLS = ["/", "/workspace"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Network-first for API routes
  if (event.request.url.includes("/api/")) return;
  // Cache-first for navigation
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match("/").then((r) => r ?? Response.error())
      )
    );
  }
});
```

- [ ] **Step 2: Add service worker registration to root layout**

In `src/app/layout.tsx`, after the closing `<body>` tag (or in a `<script>` tag within body):

```tsx
<script
  dangerouslySetInnerHTML={{
    __html: `
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
          navigator.serviceWorker.register('/sw.js');
        });
      }
    `,
  }}
/>
```

- [ ] **Step 3: Commit**

```bash
git add public/sw.js src/app/layout.tsx
git commit -m "feat: register minimal service worker for PWA install-ability"
```
