import { Worker } from "bullmq";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getRedisConnection,
  QUEUE_AUTOMATION,
  QUEUE_DATA_KEEPER,
  JOB_OVERDUE_INVOICE,
  JOB_LOST_QUOTE_EMAIL,
  JOB_LOST_QUOTE_SMS,
  JOB_ANALYZE_DATA_FRAGMENT,
} from "@/lib/queue/client";
import { processOverdueInvoice, type OverdueInvoiceJobData } from "@/lib/queue/jobs/overdue-invoice";
import { processLostQuoteEmail, processLostQuoteSms, type LostQuoteEmailJobData } from "@/lib/queue/jobs/lost-quote";
import { processDataKeeperJob } from "@/lib/queue/jobs/data-keeper-job";
import type { DataKeeperJobData } from "@/lib/data-keeper/types";

// ── Worker ────────────────────────────────────────────────────────────────────
// Created with autorun: false so callers control when processing starts.
// Each cron invocation creates a Worker, drains available jobs, then exits.
// Failed jobs are NOT removed (removeOnFail: false) — they accumulate in the
// Dead Letter Queue in Redis and can be retried or inspected via BullMQ Board.

export function createAutomationWorker() {
  const worker = new Worker(
    QUEUE_AUTOMATION,
    async (job) => {
      const supabase = createAdminClient();

      switch (job.name) {
        case JOB_OVERDUE_INVOICE: {
          const result = await processOverdueInvoice(
            job.data as OverdueInvoiceJobData,
            supabase,
          );
          return result;
        }

        case JOB_LOST_QUOTE_EMAIL: {
          const result = await processLostQuoteEmail(
            job.data as LostQuoteEmailJobData,
            supabase,
          );
          return result;
        }

        case JOB_LOST_QUOTE_SMS: {
          const result = await processLostQuoteSms(
            job.data as LostQuoteEmailJobData,
            supabase,
          );
          return result;
        }

        default:
          throw new Error(`Unknown job name: ${job.name}`);
      }
    },
    {
      connection: getRedisConnection(),
      autorun: false,
      concurrency: 2,
    },
  );

  worker.on("completed", (job, result) => {
    console.info(`[automation.worker] Job completed`, {
      id: job.id,
      name: job.name,
      result,
    });
  });

  worker.on("failed", (job, err) => {
    console.error(`[automation.worker] Job failed`, {
      id: job?.id,
      name: job?.name,
      attempt: job?.attemptsMade,
      error: err.message,
    });
  });

  return worker;
}

// ── Data Keeper Worker ────────────────────────────────────────────────────────

export function createDataKeeperWorker() {
  const worker = new Worker(
    QUEUE_DATA_KEEPER,
    async (job) => {
      switch (job.name) {
        case JOB_ANALYZE_DATA_FRAGMENT: {
          return await processDataKeeperJob(job.data as DataKeeperJobData);
        }
        default:
          throw new Error(`Unknown data keeper job: ${job.name}`);
      }
    },
    {
      connection: getRedisConnection(),
      autorun: false,
      concurrency: 2,
    },
  );

  worker.on("completed", (job, result) => {
    console.info(`[data-keeper.worker] Job completed`, {
      id: job.id,
      name: job.name,
      result,
    });
  });

  worker.on("failed", (job, err) => {
    console.error(`[data-keeper.worker] Job failed`, {
      id: job?.id,
      name: job?.name,
      attempt: job?.attemptsMade,
      error: err.message,
    });
  });

  return worker;
}
