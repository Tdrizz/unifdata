import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  debug: false,
  replaysOnErrorSampleRate: 0,
  replaysSessionSampleRate: 0,
  beforeSend(event) {
    // Scrub PII from request bodies and query strings
    if (event.request) {
      delete event.request.data;
      if (event.request.query_string) {
        event.request.query_string = "[Filtered]";
      }
      if (event.request.headers) {
        delete event.request.headers["Authorization"];
        delete event.request.headers["Cookie"];
        delete event.request.headers["cookie"];
      }
    }
    // Scrub user context
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
      delete event.user.username;
    }
    return event;
  },
});
