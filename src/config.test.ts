import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "./config.js";

const FULL_ENV = {
  SLACK_TOKEN: "xoxp-test",
  CONFLUENCE_TOKEN: "conf-token",
  CONFLUENCE_BASE_URL: "https://test.atlassian.net/wiki",
  CONFLUENCE_EMAIL: "test@example.com",
  JIRA_TOKEN: "jira-token",
  JIRA_EMAIL: "test@example.com",
  GITHUB_TOKEN: "ghp_test",
  LOCAL_REPO_PATH: "/tmp/repo",
};

describe("loadConfig", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    Object.assign(process.env, FULL_ENV);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return a valid config when all variables are set", () => {
    const config = loadConfig();
    expect(config.slackToken).toBe("xoxp-test");
    expect(config.confluenceToken).toBe("conf-token");
    expect(config.confluenceBaseUrl).toBe("https://test.atlassian.net/wiki");
    expect(config.confluenceEmail).toBe("test@example.com");
    expect(config.jiraToken).toBe("jira-token");
    expect(config.jiraEmail).toBe("test@example.com");
    expect(config.githubToken).toBe("ghp_test");
    expect(config.localRepoPath).toBe("/tmp/repo");
  });

  it("should throw when a required variable is missing", () => {
    delete process.env.JIRA_TOKEN;
    expect(() => loadConfig()).toThrow("Missing required environment variables");
    expect(() => loadConfig()).toThrow("JIRA_TOKEN");
  });

  it("should succeed without optional variables", () => {
    delete process.env.SLACK_TOKEN;
    delete process.env.CONFLUENCE_TOKEN;
    delete process.env.CONFLUENCE_BASE_URL;
    delete process.env.CONFLUENCE_EMAIL;
    delete process.env.GITHUB_TOKEN;
    const config = loadConfig();
    expect(config.slackToken).toBeUndefined();
    expect(config.confluenceToken).toBeUndefined();
    expect(config.githubToken).toBeUndefined();
    expect(config.jiraToken).toBe("jira-token");
  });
});
