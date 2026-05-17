import { clerkMiddleware } from "@clerk/nextjs/server";

// Runs on every request to attach Clerk auth context to headers.
// Route-level protection is handled per-page via getCurrentCompany() / requireSubscription().
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
