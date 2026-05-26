import { Worker } from "bullmq";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getRedisConnection,
  QUEUE_AUTOMATION,
  QUEUE_DATA_KEEPER,
  QUEUE_SWEEPER,
  JOB_OVERDUE_INVOICE,
  JOB_LOST_QUOTE_EMAIL,
  JOB_LOST_QUOTE_SMS,
  JOB_ANALYZE_DATA_FRAGMENT,
  JOB_EMBEDDING_BACKFILL,
  JOB_SWEEP_BATCH,
  JOB_RUN_NIGHTLY_COORDINATOR,
  JOB_POST_COMPLETION_OUTREACH,
  JOB_NEW_CONTACT_FOLLOWUP,
  JOB_RECORD_NUDGER,
  JOB_PATTERN_SPOTTER,
  JOB_VOLUME_ANTICIPATOR,
} from "@/lib/queue/client";
import { processOverdueInvoice, type OverdueInvoiceJobData } from "@/lib/queue/jobs/overdue-invoice";
import { processLostQuoteEmail, processLostQuoteSms, type LostQuoteEmailJobData } from "@/lib/queue/jobs/lost-quote";
import { processDataKeeperJob } from "@/lib/queue/jobs/data-keeper-job";
import { processEmbeddingBackfillJob, type EmbeddingBackfillJobData } from "@/lib/queue/jobs/embedding-backfill-job";
import { processSweeperJob, type SweeperJobData } from "@/lib/queue/jobs/sweeper-job";
import { processNightlyCoordinatorJob, type NightlyCoordinatorJobData } from "@/lib/queue/jobs/nightly-coordinator-job";
import { processPostCompletionOutreachJob, type PostCompletionOutreachJobData } from "@/lib/queue/jobs/post-completion-outreach-job";
import { processNewContactFollowupJob, type NewContactFollowupJobData } from "@/lib/queue/jobs/new-contact-followup-job";
import { processRecordNudgerJob, type RecordNudgerJobData } from "@/lib/queue/jobs/record-nudger-job";
import { processPatternSpotterJob, type PatternSpotterJobData } from "@/lib/queue/jobs/pattern-spotter-job";
import { processVolumeAnticipatorJob, type VolumeAnticipatorJobData } from "@/lib/queue/jobs/volume-anticipator-job";
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
        case JOB_RUN_NIGHTLY_COORDINATOR: {
          await processNightlyCoordinatorJob(job.data as NightlyCoordinatorJobData);
          return;
        }

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

        case JOB_POST_COMPLETION_OUTREACH:
          return await processPostCompletionOutreachJob(job.data as PostCompletionOutreachJobData);

        case JOB_NEW_CONTACT_FOLLOWUP:
          return await processNewContactFollowupJob(job.data as NewContactFollowupJobData);

        case JOB_RECORD_NUDGER:
          return await processRecordNudgerJob(job.data as RecordNudgerJobData);

        case JOB_PATTERN_SPOTTER:
          return await processPatternSpotterJob(job.data as PatternSpotterJobData);

        case JOB_VOLUME_ANTICIPATOR:
          return await processVolumeAnticipatorJob(job.data as VolumeAnticipatorJobData);

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
        case JOB_EMBEDDING_BACKFILL: {
          return await processEmbeddingBackfillJob(job.data as EmbeddingBackfillJobData);
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

// ── Sweeper Worker ────────────────────────────────────────────────────────────

export function createSweeperWorker() {
  const worker = new Worker(
    QUEUE_SWEEPER,
    async (job) => {
      switch (job.name) {
        case JOB_SWEEP_BATCH:
          return await processSweeperJob(job.data as SweeperJobData);
        default:
          throw new Error(`Unknown sweeper job: ${job.name}`);
      }
    },
    {
      connection: getRedisConnection(),
      autorun: false,
      concurrency: 1, // sequential per-org to avoid DB contention
    },
  );

  worker.on("completed", (job, result) => {
    console.info(`[sweeper.worker] Batch completed`, {
      id: job.id,
      org: (job.data as SweeperJobData).organizationId,
      result,
    });
  });

  worker.on("failed", (job, err) => {
    console.error(`[sweeper.worker] Batch failed`, {
      id: job?.id,
      org: (job?.data as SweeperJobData)?.organizationId,
      attempt: job?.attemptsMade,
      error: err.message,
    });
  });

  return worker;
}
