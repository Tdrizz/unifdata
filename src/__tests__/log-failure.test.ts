import { describe, it, expect } from "vitest";
import { tryParseJson } from "@/lib/agents/log-failure";

// A model's raw text response used to go straight into `JSON.parse`, which
// throws on anything that isn't valid JSON -- including a case that mattered:
// in manager-agent.ts, that throw skipped straight past the schema-reminder
// retry (meant for exactly this scenario) into the outer catch block. Every
// worker now goes through tryParseJson instead so a malformed response is
// just another Zod validation failure, not a different code path.
describe("tryParseJson", () => {
  it("parses valid JSON normally", () => {
    expect(tryParseJson('{"a": 1}')).toEqual({ a: 1 });
    expect(tryParseJson("[1, 2, 3]")).toEqual([1, 2, 3]);
  });

  it("returns undefined instead of throwing on invalid JSON", () => {
    expect(tryParseJson("not json at all")).toBeUndefined();
    expect(tryParseJson("")).toBeUndefined();
    expect(tryParseJson("{unterminated")).toBeUndefined();
  });

  it("returns undefined for a response truncated mid-object", () => {
    // A realistic failure mode: the model hit a token limit mid-response.
    expect(tryParseJson('{"alerts": [{"title": "Something wen')).toBeUndefined();
  });
});
