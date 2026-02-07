import { describe, it, expect } from "vitest";
import type { CliArgs } from "./types.js";

// Test the parseArgs logic by extracting it as a pure function
function parseArgs(argv: string[]): Partial<CliArgs> & { slack: string[]; confluence: string[]; github: string[]; dryRun: boolean } {
  const args: { jira?: string; slack: string[]; confluence: string[]; github: string[]; dryRun: boolean } = {
    slack: [],
    confluence: [],
    github: [],
    dryRun: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const value = argv[i + 1];
    switch (arg) {
      case "--jira":
        args.jira = value;
        i++;
        break;
      case "--slack":
        args.slack.push(value);
        i++;
        break;
      case "--confluence":
        args.confluence.push(value);
        i++;
        break;
      case "--github":
        args.github.push(value);
        i++;
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
    }
  }
  return args;
}

describe("CLI argument parsing", () => {
  it("should parse --jira flag", () => {
    const result = parseArgs(["node", "script", "--jira", "https://test.atlassian.net/browse/PROJ-123"]);
    expect(result.jira).toBe("https://test.atlassian.net/browse/PROJ-123");
  });

  it("should parse all flags", () => {
    const result = parseArgs([
      "node",
      "script",
      "--jira",
      "https://test.atlassian.net/browse/PROJ-123",
      "--slack",
      "https://test.slack.com/archives/C123/p456",
      "--confluence",
      "https://test.atlassian.net/wiki/pages/789",
      "--github",
      "https://github.com/org/repo/pull/42",
    ]);
    expect(result.jira).toBe("https://test.atlassian.net/browse/PROJ-123");
    expect(result.slack).toEqual(["https://test.slack.com/archives/C123/p456"]);
    expect(result.confluence).toEqual(["https://test.atlassian.net/wiki/pages/789"]);
    expect(result.github).toEqual(["https://github.com/org/repo/pull/42"]);
  });

  it("should handle only --jira flag", () => {
    const result = parseArgs(["node", "script", "--jira", "https://test.atlassian.net/browse/PROJ-456"]);
    expect(result.jira).toBe("https://test.atlassian.net/browse/PROJ-456");
    expect(result.slack).toEqual([]);
    expect(result.confluence).toEqual([]);
    expect(result.github).toEqual([]);
  });

  it("should return empty when no args", () => {
    const result = parseArgs(["node", "script"]);
    expect(result.jira).toBeUndefined();
  });

  it("should support multiple URLs for the same flag", () => {
    const result = parseArgs([
      "node",
      "script",
      "--jira",
      "https://test.atlassian.net/browse/PROJ-123",
      "--github",
      "https://github.com/org/repo/pull/1",
      "--github",
      "https://github.com/org/repo/pull/2",
      "--slack",
      "https://test.slack.com/archives/C123/p111",
      "--slack",
      "https://test.slack.com/archives/C456/p222",
    ]);
    expect(result.github).toEqual([
      "https://github.com/org/repo/pull/1",
      "https://github.com/org/repo/pull/2",
    ]);
    expect(result.slack).toEqual([
      "https://test.slack.com/archives/C123/p111",
      "https://test.slack.com/archives/C456/p222",
    ]);
  });

  it("should parse --dry-run flag", () => {
    const result = parseArgs([
      "node",
      "script",
      "--jira",
      "https://test.atlassian.net/browse/PROJ-123",
      "--dry-run",
    ]);
    expect(result.dryRun).toBe(true);
  });

  it("should default dryRun to false", () => {
    const result = parseArgs(["node", "script", "--jira", "https://test.atlassian.net/browse/PROJ-123"]);
    expect(result.dryRun).toBe(false);
  });
});
