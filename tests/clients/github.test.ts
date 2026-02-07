import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchGitHubPr } from "../../src/clients/github.js";

describe("fetchGitHubPr", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch PR data with review comments", async () => {
    const mockFetch = vi.fn()
      // PR info
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ title: "Fix bug", body: "Description" }),
      })
      // Diff
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("diff --git a/file.ts b/file.ts\n+fixed"),
      })
      // Issue comments
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { user: { login: "commenter" }, body: "Looks good" },
          ]),
      })
      // Review comments (inline code)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { user: { login: "reviewer" }, body: "nit: typo", path: "src/file.ts" },
          ]),
      })
      // Reviews
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { user: { login: "reviewer" }, body: "LGTM overall", state: "APPROVED" },
            { user: { login: "other" }, body: "", state: "COMMENTED" },
          ]),
      })
      // Files
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([{ filename: "src/file.ts" }]),
      });

    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchGitHubPr("ghp_token", {
      owner: "org",
      repo: "repo",
      pullNumber: 123,
    });

    expect(result.title).toBe("Fix bug");
    expect(result.description).toBe("Description");
    expect(result.diff).toContain("+fixed");
    expect(result.comments).toHaveLength(1);
    expect(result.comments[0].body).toBe("Looks good");
    expect(result.reviewComments).toHaveLength(2);
    expect(result.reviewComments[0].body).toBe("LGTM overall");
    expect(result.reviewComments[1].body).toBe("nit: typo");
    expect(result.reviewComments[1].path).toBe("src/file.ts");
    expect(result.changedFiles).toEqual(["src/file.ts"]);
    expect(mockFetch).toHaveBeenCalledTimes(6);
  });

  it("should throw on PR fetch error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 })
    );

    await expect(
      fetchGitHubPr("token", { owner: "org", repo: "repo", pullNumber: 999 })
    ).rejects.toThrow("GitHub API error: 404");
  });

  it("should handle null PR body", async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ title: "PR", body: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(""),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchGitHubPr("token", {
      owner: "org",
      repo: "repo",
      pullNumber: 1,
    });
    expect(result.description).toBe("");
    expect(result.reviewComments).toEqual([]);
  });
});
