import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/subscribe(.*)",
  "/pricing(.*)",
  "/docs(.*)",
  "/terms(.*)",
  "/privacy(.*)",
  "/preview(.*)",
  "/waitlist(.*)",
  "/api/stripe/webhook(.*)",
  "/api/leads/ingest(.*)",
  "/api/inbound-sync(.*)",
  "/api/cron/(.*)",
  "/api/webhooks/(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|woff|woff2|ttf|otf)$).*)",
  ],
};
