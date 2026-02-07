import dotenv from "dotenv";

dotenv.config();

export type Config = {
  slackToken?: string;
  confluenceToken?: string;
  confluenceBaseUrl?: string;
  confluenceEmail?: string;
  jiraToken: string;
  jiraEmail: string;
  githubToken?: string;
  localRepoPath: string;
  claudeModel?: string;
};

const REQUIRED_VARS = [
  "JIRA_TOKEN",
  "JIRA_EMAIL",
  "LOCAL_REPO_PATH",
] as const;

export function loadConfig(): Config {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  return {
    slackToken: process.env.SLACK_TOKEN,
    confluenceToken: process.env.CONFLUENCE_TOKEN,
    confluenceBaseUrl: process.env.CONFLUENCE_BASE_URL,
    confluenceEmail: process.env.CONFLUENCE_EMAIL,
    jiraToken: process.env.JIRA_TOKEN!,
    jiraEmail: process.env.JIRA_EMAIL!,
    githubToken: process.env.GITHUB_TOKEN,
    localRepoPath: process.env.LOCAL_REPO_PATH!,
    claudeModel: process.env.CLAUDE_MODEL,
  };
}
