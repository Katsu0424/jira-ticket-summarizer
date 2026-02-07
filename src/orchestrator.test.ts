import { describe, it, expect, vi, beforeEach } from "vitest";
import { run } from "./orchestrator.js";
import type { Config } from "./config.js";
import type { CliArgs } from "./types.js";

// Mock all dependencies
vi.mock("./clients/slack.js", () => ({
  fetchSlackThread: vi.fn().mockResolvedValue({
    messages: [{ user: "U1", text: "Issue reported", ts: "123.456" }],
  }),
}));

vi.mock("./clients/confluence.js", () => ({
  fetchConfluencePage: vi.fn().mockResolvedValue({
    title: "Design Doc",
    body: "Design document content",
  }),
}));

vi.mock("./clients/github.js", () => ({
  fetchGitHubPr: vi.fn().mockResolvedValue({
    title: "Fix bug",
    description: "Bug fix",
    diff: "+fix",
    comments: [],
    reviewComments: [{ user: "reviewer", body: "LGTM", path: "" }],
    changedFiles: ["src/file.ts"],
  }),
}));

vi.mock("./clients/jira.js", () => ({
  addJiraComment: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./collectors/import-collector.js", () => ({
  collectImporters: vi.fn().mockResolvedValue([]),
}));

vi.mock("./ai/impact-analysis.js", () => ({
  analyzeImpact: vi.fn().mockResolvedValue({ additionalFiles: [] }),
}));

vi.mock("./ai/summarizer.js", () => ({
  generateSummary: vi.fn().mockResolvedValue({
    title: "テスト要約",
    background: "背景",
    problem: "問題",
    impact: "影響",
    cause: null,
    actions: ["対応1"],
    status: "resolved",
    nextSteps: ["次のステップ"],
    qa: { cautions: ["注意"], relatedFeatures: ["機能"] },
  }),
}));

vi.mock("./ai/claude-cli.js", () => ({
  setClaudeModel: vi.fn(),
}));

const mockConfig: Config = {
  slackToken: "xoxp-test",
  confluenceToken: "conf-token",
  confluenceBaseUrl: "https://test.atlassian.net/wiki",
  confluenceEmail: "test@example.com",
  jiraToken: "jira-token",
  jiraEmail: "test@example.com",
  githubToken: "ghp_test",
  localRepoPath: "/tmp/repo",
};

describe("orchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should run full pipeline with all sources", async () => {
    const { addJiraComment } = await import("./clients/jira.js");

    const args: CliArgs = {
      jira: "https://test.atlassian.net/browse/PROJ-123",
      slack: ["https://test.slack.com/archives/C123/p1234567890123456"],
      confluence: ["https://test.atlassian.net/wiki/spaces/DEV/pages/456/Doc"],
      github: ["https://github.com/org/repo/pull/789"],
      dryRun: false,
    };

    await run(args, mockConfig);

    expect(addJiraComment).toHaveBeenCalledWith(
      "https://test.atlassian.net",
      "test@example.com",
      "jira-token",
      "PROJ-123",
      expect.objectContaining({ title: "テスト要約" })
    );
  });

  it("should run with only jira flag", async () => {
    const { generateSummary } = await import("./ai/summarizer.js");

    const args: CliArgs = {
      jira: "https://test.atlassian.net/browse/PROJ-456",
      slack: [],
      confluence: [],
      github: [],
      dryRun: false,
    };
    await run(args, mockConfig);

    expect(generateSummary).toHaveBeenCalledWith(
      null,
      null,
      null,
      ""
    );
  });

  it("should skip jira write in dry-run mode", async () => {
    const { addJiraComment } = await import("./clients/jira.js");

    const args: CliArgs = {
      jira: "https://test.atlassian.net/browse/PROJ-789",
      slack: [],
      confluence: [],
      github: [],
      dryRun: true,
    };
    await run(args, mockConfig);

    expect(addJiraComment).not.toHaveBeenCalled();
  });
});
