import { describe, it, expect } from "vitest";
import { buildImpactAnalysisPrompt, buildSummaryPrompt } from "../../src/ai/prompts.js";

describe("buildImpactAnalysisPrompt", () => {
  it("should include diff and changed files", () => {
    const prompt = buildImpactAnalysisPrompt(
      "+added line",
      ["src/file.ts"],
      ["src/other.ts"],
      { "src/other.ts": "import { x } from './file';" }
    );
    expect(prompt).toContain("+added line");
    expect(prompt).toContain("src/file.ts");
    expect(prompt).toContain("src/other.ts");
    expect(prompt).toContain("import { x }");
    expect(prompt).toContain("additionalFiles");
  });

  it("should handle empty importers", () => {
    const prompt = buildImpactAnalysisPrompt(
      "diff",
      ["file.ts"],
      [],
      {}
    );
    expect(prompt).toContain("diff");
    expect(prompt).toContain("file.ts");
  });
});

describe("buildSummaryPrompt", () => {
  it("should include all provided sections", () => {
    const prompt = buildSummaryPrompt(
      "Slack thread content",
      "Confluence page content",
      {
        title: "Fix bug",
        description: "Bug fix PR",
        diff: "+fix",
        comments: [{ user: "reviewer", body: "LGTM" }],
      },
      "impact context code"
    );
    expect(prompt).toContain("Slack thread content");
    expect(prompt).toContain("Confluence page content");
    expect(prompt).toContain("Fix bug");
    expect(prompt).toContain("impact context code");
    expect(prompt).toContain("reviewer: LGTM");
  });

  it("should handle null sections", () => {
    const prompt = buildSummaryPrompt(null, null, null, "");
    expect(prompt).not.toContain("Slackスレッド");
    expect(prompt).not.toContain("Confluenceページ");
    expect(prompt).not.toContain("Pull Request");
  });

  it("should include JSON output format instructions", () => {
    const prompt = buildSummaryPrompt(null, null, null, "");
    expect(prompt).toContain('"title"');
    expect(prompt).toContain('"background"');
    expect(prompt).toContain('"qa"');
  });
});
