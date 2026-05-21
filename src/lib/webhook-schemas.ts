import { z } from "zod";

export const JobberWebhookSchema = z.object({
  webHookEvent: z.string().optional(),
  itemId: z.string().optional(),
  accountId: z.string().optional(),
  topic: z.string().optional(),
  data: z.object({
    quote: z.object({
      id: z.string().optional(),
      quoteStatus: z.string().optional(),
      total: z.number().optional(),
      client: z.object({
        id: z.string().optional(),
        name: z.string().optional(),
      }).optional(),
    }).optional(),
  }).optional(),
});

export const QuickBooksWebhookSchema = z.object({
  eventNotifications: z.array(
    z.object({
      realmId: z.string(),
      dataChangeEvent: z.object({
        entities: z.array(
          z.object({
            name: z.string(),
            id: z.string(),
            operation: z.string(),
            lastUpdated: z.string(),
          })
        ).optional(),
      }).optional(),
    })
  ),
});

export const TwilioWebhookSchema = z.object({
  From: z.string(),
  Body: z.string().optional(),
  MessageSid: z.string(),
  To: z.string().optional(),
});
