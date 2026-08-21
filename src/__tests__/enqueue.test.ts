/**
 * The fail-loud automation enqueue helper. Verifies it never throws and always
 * reports a dropped job to Sentry — the whole point of the helper.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const addMock = vi.fn();

vi.mock("@/lib/queue/client", () => ({
  isRedisConfigured: vi.fn(),
  getAutomationQueue: vi.fn(() => ({ add: addMock })),
}));
vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

import { enqueueAutomationJob } from "@/lib/queue/enqueue";
import { isRedisConfigured, getAutomationQueue } from "@/lib/queue/client";
import * as Sentry from "@sentry/nextjs";

const mockRedis = vi.mocked(isRedisConfigured);
const mockGetQueue = vi.mocked(getAutomationQueue);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetQueue.mockReturnValue({ add: addMock } as never);
});

describe("enqueueAutomationJob", () => {
  it("returns false and alerts Sentry when Redis is not configured", async () => {
    mockRedis.mockReturnValue(false);

    const ok = await enqueueAutomationJob("job-x", { a: 1 }, {}, { org: "o1" });

    expect(ok).toBe(false);
    expect(Sentry.captureMessage).toHaveBeenCalledOnce();
    expect(addMock).not.toHaveBeenCalled();
  });

  it("returns true and enqueues when Redis is available", async () => {
    mockRedis.mockReturnValue(true);
    addMock.mockResolvedValue({ id: "1" });

    const ok = await enqueueAutomationJob("job-x", { a: 1 }, { delay: 5 });

    expect(ok).toBe(true);
    expect(addMock).toHaveBeenCalledWith("job-x", { a: 1 }, { delay: 5 });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("returns false and captures the exception when the enqueue throws", async () => {
    mockRedis.mockReturnValue(true);
    addMock.mockRejectedValue(new Error("redis down"));

    const ok = await enqueueAutomationJob("job-x", {}, {}, { org: "o1", detail: { event: "e" } });

    expect(ok).toBe(false);
    expect(Sentry.captureException).toHaveBeenCalledOnce();
  });

  it("never throws even when the queue factory itself throws", async () => {
    mockRedis.mockReturnValue(true);
    mockGetQueue.mockImplementation(() => {
      throw new Error("boom");
    });

    await expect(enqueueAutomationJob("job-x", {}, {})).resolves.toBe(false);
    expect(Sentry.captureException).toHaveBeenCalledOnce();
  });
});
