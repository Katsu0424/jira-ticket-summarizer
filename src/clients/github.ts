import type { GitHubPrData, GitHubPrUrlInfo } from "../types.js";

export async function fetchGitHubPr(
  token: string,
  info: GitHubPrUrlInfo
): Promise<GitHubPrData> {
  const baseApi = `https://api.github.com/repos/${info.owner}/${info.repo}/pulls/${info.pullNumber}`;
  const issueApi = `https://api.github.com/repos/${info.owner}/${info.repo}/issues/${info.pullNumber}`;
  const headers = {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json",
  };

  // Fetch all data in parallel:
  // - PR info
  // - diff
  // - issue comments (general PR comments)
  // - review comments (inline code comments on diff)
  // - reviews (approve/reject/comment summaries)
  // - files
  const [prRes, diffRes, issueCommentsRes, reviewCommentsRes, reviewsRes, filesRes] = await Promise.all([
    fetch(baseApi, { headers }),
    fetch(baseApi, {
      headers: { ...headers, Accept: "application/vnd.github.v3.diff" },
    }),
    fetch(`${issueApi}/comments`, { headers }),
    fetch(`${baseApi}/comments`, { headers }),
    fetch(`${baseApi}/reviews`, { headers }),
    fetch(`${baseApi}/files`, { headers }),
  ]);

  if (!prRes.ok) throw new Error(`GitHub API error: ${prRes.status}`);
  if (!diffRes.ok) throw new Error(`GitHub diff error: ${diffRes.status}`);
  if (!issueCommentsRes.ok) throw new Error(`GitHub comments error: ${issueCommentsRes.status}`);
  if (!reviewCommentsRes.ok) throw new Error(`GitHub review comments error: ${reviewCommentsRes.status}`);
  if (!reviewsRes.ok) throw new Error(`GitHub reviews error: ${reviewsRes.status}`);
  if (!filesRes.ok) throw new Error(`GitHub files error: ${filesRes.status}`);

  const pr = await prRes.json();
  const diff = await diffRes.text();
  const issueComments = await issueCommentsRes.json();
  const reviewCommentsRaw = await reviewCommentsRes.json();
  const reviews = await reviewsRes.json();
  const files = await filesRes.json();

  // General PR comments (issue comments)
  const comments = issueComments.map((c: any) => ({
    user: c.user?.login ?? "unknown",
    body: c.body ?? "",
  }));

  // Review comments: review summaries + inline code comments
  const reviewComments: { user: string; body: string; path: string }[] = [];

  // Review summaries (approve/reject/comment with body)
  for (const review of reviews) {
    if (review.body) {
      reviewComments.push({
        user: review.user?.login ?? "unknown",
        body: review.body,
        path: "",
      });
    }
  }

  // Inline code review comments
  for (const c of reviewCommentsRaw) {
    reviewComments.push({
      user: c.user?.login ?? "unknown",
      body: c.body ?? "",
      path: c.path ?? "",
    });
  }

  return {
    title: pr.title,
    description: pr.body ?? "",
    diff,
    comments,
    reviewComments,
    changedFiles: files.map((f: any) => f.filename),
  };
}
