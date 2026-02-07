import type {
  SlackUrlInfo,
  ConfluenceUrlInfo,
  GitHubPrUrlInfo,
  JiraUrlInfo,
} from "../types.js";

export function parseSlackUrl(url: string): SlackUrlInfo {
  const match = url.match(
    /^https:\/\/([^.]+)\.slack\.com\/archives\/([A-Z0-9]+)\/p(\d+)$/
  );
  if (!match) {
    throw new Error(`Invalid Slack URL: ${url}`);
  }
  const [, workspace, channelId, rawTs] = match;
  // p1234567890123456 -> 1234567890.123456
  const threadTs = rawTs.slice(0, -6) + "." + rawTs.slice(-6);
  return { workspace, channelId, threadTs };
}

export function parseConfluenceUrl(url: string): ConfluenceUrlInfo {
  const parsed = new URL(url);
  const baseUrl = `${parsed.origin}/wiki`;

  // /wiki/spaces/SPACE/pages/123456/Title or /wiki/pages/123456
  const pagesMatch = parsed.pathname.match(/\/wiki\/(?:spaces\/[^/]+\/)?pages\/(\d+)/);
  if (!pagesMatch) {
    throw new Error(`Invalid Confluence URL: ${url}`);
  }
  return { baseUrl, pageId: pagesMatch[1] };
}

export function parseGitHubPrUrl(url: string): GitHubPrUrlInfo {
  const match = url.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/
  );
  if (!match) {
    throw new Error(`Invalid GitHub PR URL: ${url}`);
  }
  return {
    owner: match[1],
    repo: match[2],
    pullNumber: parseInt(match[3], 10),
  };
}

export function parseJiraUrl(url: string): JiraUrlInfo {
  // https://xxx.atlassian.net/browse/PROJ-123
  const match = url.match(
    /^(https:\/\/[^/]+)\/browse\/([A-Z][A-Z0-9_]+-\d+)/
  );
  if (!match) {
    throw new Error(`Invalid Jira URL: ${url}`);
  }
  return {
    baseUrl: match[1],
    issueKey: match[2],
  };
}
