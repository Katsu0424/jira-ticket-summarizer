import { describe, it, expect, vi, beforeEach } from "vitest";
import { addJiraComment } from "../../src/clients/jira.js";
import type { Summary } from "../../src/types.js";

const baseSummary: Summary = {
  title: "ログイン機能の不具合修正",
  background: "ユーザーからログインできないとの報告",
  problem: "セッショントークンの有効期限チェックに不具合",
  impact: "全ユーザーのログインに影響",
  cause: "トークン検証ロジックのタイムゾーン処理ミス",
  actions: ["トークン検証ロジックを修正", "テストケースを追加"],
  status: "resolved",
  nextSteps: ["本番デプロイ", "モニタリング継続"],
  qa: {
    cautions: ["ログイン・ログアウトの動作確認", "セッション維持の確認"],
    relatedFeatures: ["認証機能", "セッション管理"],
  },
};

describe("addJiraComment", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should create a comment with ADF structure", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: "12345" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await addJiraComment(
      "https://mysite.atlassian.net",
      "user@example.com",
      "api-token",
      "PROJ-123",
      baseSummary
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe(
      "https://mysite.atlassian.net/rest/api/3/issue/PROJ-123/comment"
    );
    expect(options.method).toBe("POST");

    const body = JSON.parse(options.body);
    expect(body.body.version).toBe(1);
    expect(body.body.type).toBe("doc");
    expect(body.body.content).toBeInstanceOf(Array);

    // Verify heading for title exists
    const titleHeading = body.body.content[0];
    expect(titleHeading.type).toBe("heading");
    expect(titleHeading.attrs.level).toBe(1);
    expect(titleHeading.content[0].text).toBe("ログイン機能の不具合修正");

    // Verify cause section is present
    const causeHeadingIndex = body.body.content.findIndex(
      (node: any) =>
        node.type === "heading" &&
        node.content?.[0]?.text === "原因"
    );
    expect(causeHeadingIndex).toBeGreaterThan(-1);
  });

  it("should throw on HTTP error", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: () => Promise.resolve("Forbidden"),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      addJiraComment(
        "https://mysite.atlassian.net",
        "user@example.com",
        "token",
        "PROJ-999",
        baseSummary
      )
    ).rejects.toThrow("Jira API error: 403 - Forbidden");
  });

  it("should use Basic auth with base64 encoded email:token", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal("fetch", mockFetch);

    await addJiraComment(
      "https://mysite.atlassian.net",
      "user@example.com",
      "my-api-token",
      "PROJ-1",
      baseSummary
    );

    const [, options] = mockFetch.mock.calls[0];
    const expectedAuth = Buffer.from("user@example.com:my-api-token").toString(
      "base64"
    );
    expect(options.headers.Authorization).toBe(`Basic ${expectedAuth}`);
    expect(options.headers["Content-Type"]).toBe("application/json");
  });

  it("should omit cause section when cause is null", async () => {
    const summaryWithoutCause: Summary = {
      ...baseSummary,
      cause: null,
    };

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal("fetch", mockFetch);

    await addJiraComment(
      "https://mysite.atlassian.net",
      "user@example.com",
      "token",
      "PROJ-2",
      summaryWithoutCause
    );

    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);

    // Verify no cause heading exists
    const causeHeading = body.body.content.find(
      (node: any) =>
        node.type === "heading" &&
        node.content?.[0]?.text === "原因"
    );
    expect(causeHeading).toBeUndefined();
  });
});
