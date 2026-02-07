import { describe, it, expect } from "vitest";
import {
  parseSlackUrl,
  parseConfluenceUrl,
  parseGitHubPrUrl,
  parseJiraUrl,
} from "./url-parser.js";

describe("parseSlackUrl", () => {
  it("should parse a valid Slack URL", () => {
    const result = parseSlackUrl(
      "https://myteam.slack.com/archives/C01ABC23DEF/p1234567890123456"
    );
    expect(result).toEqual({
      workspace: "myteam",
      channelId: "C01ABC23DEF",
      threadTs: "1234567890.123456",
    });
  });

  it("should handle different workspace names", () => {
    const result = parseSlackUrl(
      "https://acme.slack.com/archives/C999/p9999999999999999"
    );
    expect(result.workspace).toBe("acme");
    expect(result.threadTs).toBe("9999999999.999999");
  });

  it("should throw on invalid URL", () => {
    expect(() => parseSlackUrl("https://example.com")).toThrow(
      "Invalid Slack URL"
    );
  });

  it("should throw on Slack URL without thread", () => {
    expect(() =>
      parseSlackUrl("https://myteam.slack.com/archives/C01ABC23DEF")
    ).toThrow("Invalid Slack URL");
  });
});

describe("parseConfluenceUrl", () => {
  it("should parse URL with spaces and page title", () => {
    const result = parseConfluenceUrl(
      "https://myteam.atlassian.net/wiki/spaces/DEV/pages/123456/My+Page"
    );
    expect(result).toEqual({
      baseUrl: "https://myteam.atlassian.net/wiki",
      pageId: "123456",
    });
  });

  it("should parse short URL format", () => {
    const result = parseConfluenceUrl(
      "https://myteam.atlassian.net/wiki/pages/789"
    );
    expect(result).toEqual({
      baseUrl: "https://myteam.atlassian.net/wiki",
      pageId: "789",
    });
  });

  it("should throw on invalid URL", () => {
    expect(() =>
      parseConfluenceUrl("https://myteam.atlassian.net/jira/browse/PROJ-1")
    ).toThrow("Invalid Confluence URL");
  });
});

describe("parseGitHubPrUrl", () => {
  it("should parse a valid GitHub PR URL", () => {
    const result = parseGitHubPrUrl(
      "https://github.com/myorg/myrepo/pull/456"
    );
    expect(result).toEqual({
      owner: "myorg",
      repo: "myrepo",
      pullNumber: 456,
    });
  });

  it("should handle URLs with trailing path segments", () => {
    const result = parseGitHubPrUrl(
      "https://github.com/myorg/myrepo/pull/456/files"
    );
    expect(result.pullNumber).toBe(456);
  });

  it("should throw on invalid URL", () => {
    expect(() =>
      parseGitHubPrUrl("https://github.com/myorg/myrepo/issues/123")
    ).toThrow("Invalid GitHub PR URL");
  });
});

describe("parseJiraUrl", () => {
  it("should parse a valid Jira URL", () => {
    const result = parseJiraUrl(
      "https://myteam.atlassian.net/browse/PROJ-123"
    );
    expect(result).toEqual({
      baseUrl: "https://myteam.atlassian.net",
      issueKey: "PROJ-123",
    });
  });

  it("should handle underscore in project key", () => {
    const result = parseJiraUrl(
      "https://myteam.atlassian.net/browse/MY_PROJ-456"
    );
    expect(result.issueKey).toBe("MY_PROJ-456");
  });

  it("should throw on invalid URL", () => {
    expect(() => parseJiraUrl("https://myteam.atlassian.net/PROJ-123")).toThrow(
      "Invalid Jira URL"
    );
  });

  it("should throw on non-Jira URL", () => {
    expect(() => parseJiraUrl("https://example.com")).toThrow(
      "Invalid Jira URL"
    );
  });
});
