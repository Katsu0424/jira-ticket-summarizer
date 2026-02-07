import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchConfluencePage } from "../../src/clients/confluence.js";

describe("fetchConfluencePage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch and return page with HTML stripped", async () => {
    const mockResponse = {
      title: "Test Page",
      body: {
        storage: {
          value:
            "<h1>Title</h1><p>Hello &amp; welcome to the <b>page</b>.</p>",
        },
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })
    );

    const result = await fetchConfluencePage(
      "https://example.atlassian.net/wiki",
      "user@example.com",
      "api-token",
      { baseUrl: "https://example.atlassian.net/wiki", pageId: "12345" }
    );

    expect(result.title).toBe("Test Page");
    expect(result.body).toBe("Title Hello & welcome to the page .");
    expect(result.body).not.toContain("<");
    expect(result.body).not.toContain("&amp;");
  });

  it("should throw on HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403 })
    );

    await expect(
      fetchConfluencePage(
        "https://example.atlassian.net/wiki",
        "user@example.com",
        "bad-token",
        { baseUrl: "https://example.atlassian.net/wiki", pageId: "12345" }
      )
    ).rejects.toThrow("Confluence API error: 403");
  });

  it("should send Basic auth header with email and token", async () => {
    const mockResponse = {
      title: "Page",
      body: { storage: { value: "<p>Content</p>" } },
    };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });
    vi.stubGlobal("fetch", mockFetch);

    await fetchConfluencePage(
      "https://example.atlassian.net/wiki",
      "user@example.com",
      "api-token",
      { baseUrl: "https://example.atlassian.net/wiki", pageId: "99999" }
    );

    const expectedAuth = Buffer.from("user@example.com:api-token").toString(
      "base64"
    );
    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.atlassian.net/wiki/rest/api/content/99999?expand=body.storage",
      {
        headers: {
          Authorization: `Basic ${expectedAuth}`,
          Accept: "application/json",
        },
      }
    );
  });
});
