import IORedis from "ioredis";
import { Queue } from "bullmq";

// ── Redis connection ───────────────────────────────────────────────────────────
// For Vercel + Upstash, set REDIS_URL to a rediss:// URL.
// For local dev, set REDIS_URL=redis://localhost:6379.
// lazyConnect + maxRetriesPerRequest=null is required by BullMQ.

let connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (connection) return connection;

  const url = process.env.REDIS_URL;
  if (!url) throw new Error("Missing required environment variable: REDIS_URL");

  connection = new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  return connection;
}

// ── Queue names ────────────────────────────────────────────────────────────────

export const QUEUE_AUTOMATION = "automation";

// ── Job names ─────────────────────────────────────────────────────────────────

export const JOB_OVERDUE_INVOICE = "overdue-invoice-remediation";
export const JOB_LOST_QUOTE_EMAIL = "lost-quote-email";
export const JOB_LOST_QUOTE_SMS = "lost-quote-sms";

// ── Default job options (from spec) ───────────────────────────────────────────
// attempts: 5 with exponential backoff starting at 5 s → 5, 10, 20, 40, 80 s.
// removeOnComplete: true  — completed jobs don't pile up in Redis.
// removeOnFail: false     — failed jobs stay in the Dead Letter Queue for review.

export const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: {
    type: "exponential" as const,
    delay: 5000,
  },
  removeOnComplete: true,
  removeOnFail: false,
};

// ── Queue factory ─────────────────────────────────────────────────────────────

let automationQueue: Queue | null = null;

export function getAutomationQueue(): Queue {
  if (automationQueue) return automationQueue;

  automationQueue = new Queue(QUEUE_AUTOMATION, {
    connection: getRedisConnection(),
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });

  return automationQueue;
}
