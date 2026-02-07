export type Summary = {
  title: string;
  background: string;
  problem: string;
  impact: string;
  cause: string | null;
  actions: string[];
  status: "investigating" | "in_progress" | "resolved" | "monitoring";
  nextSteps: string[];
  qa: {
    cautions: string[];
    relatedFeatures: string[];
  };
};

export type CliArgs = {
  jira: string;
  slack: string[];
  confluence: string[];
  github: string[];
  dryRun: boolean;
};

export type SlackUrlInfo = {
  workspace: string;
  channelId: string;
  threadTs: string;
};

export type ConfluenceUrlInfo = {
  baseUrl: string;
  pageId: string;
};

export type GitHubPrUrlInfo = {
  owner: string;
  repo: string;
  pullNumber: number;
};

export type JiraUrlInfo = {
  baseUrl: string;
  issueKey: string;
};

export type SlackThreadData = {
  messages: { user: string; text: string; ts: string }[];
};

export type ConfluencePageData = {
  title: string;
  body: string;
};

export type GitHubPrData = {
  title: string;
  description: string;
  diff: string;
  comments: { user: string; body: string }[];
  reviewComments: { user: string; body: string; path: string }[];
  changedFiles: string[];
};

export type ImpactAnalysisResult = {
  additionalFiles: string[];
};
