import Langfuse from "langfuse";

export const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
  baseUrl: process.env.LANGFUSE_HOST ?? "https://cloud.langfuse.com",
  flushAt: 10,
  flushInterval: 5000,
});

export async function flushLangfuse(): Promise<void> {
  try {
    await langfuse.flushAsync();
  } catch {}
}
