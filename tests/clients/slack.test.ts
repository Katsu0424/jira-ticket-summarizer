import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchSlackThread } from "../../src/clients/slack.js";

describe("fetchSlackThread", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch and return thread messages", async () => {
    // Mock fetch to return Slack API response
    const mockResponse = {
      ok: true,
      messages: [
        { user: "U123", text: "Hello", ts: "1234567890.123456" },
        { user: "U456", text: "World", ts: "1234567890.123457" },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })
    );

    const result = await fetchSlackThread("xoxp-token", {
      workspace: "test",
      channelId: "C123",
      threadTs: "1234567890.123456",
    });

    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].text).toBe("Hello");
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("should throw on HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401 })
    );

    await expect(
      fetchSlackThread("bad-token", {
        workspace: "test",
        channelId: "C123",
        threadTs: "123.456",
      })
    ).rejects.toThrow("Slack API error: 401");
  });

  it("should throw on Slack API error response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ok: false, error: "channel_not_found" }),
      })
    );

    await expect(
      fetchSlackThread("token", {
        workspace: "test",
        channelId: "INVALID",
        threadTs: "123.456",
      })
    ).rejects.toThrow("channel_not_found");
  });
});
