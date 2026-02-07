import type {
  CliArgs,
  Summary,
  SlackThreadData,
  ConfluencePageData,
  GitHubPrData,
} from "./types.js";
import type { Config } from "./config.js";
import { parseSlackUrl, parseConfluenceUrl, parseGitHubPrUrl, parseJiraUrl } from "./utils/url-parser.js";
import { getDiff, getChangedFiles, getFileContent } from "./utils/git.js";
import { fetchSlackThread } from "./clients/slack.js";
import { fetchConfluencePage } from "./clients/confluence.js";
import { fetchGitHubPr } from "./clients/github.js";
import { addJiraComment } from "./clients/jira.js";
import { collectImporters } from "./collectors/import-collector.js";
import { analyzeImpact } from "./ai/impact-analysis.js";
import { generateSummary } from "./ai/summarizer.js";
import { setClaudeModel } from "./ai/claude-cli.js";

function log(step: string, detail: string): void {
  const time = new Date().toLocaleTimeString("ja-JP");
  console.log(`[${time}] ${step} ${detail}`);
}

export async function run(args: CliArgs, config: Config): Promise<void> {
  // Set Claude model if configured
  setClaudeModel(config.claudeModel);

  // Validate that required tokens are set for requested sources
  if (args.slack.length > 0 && !config.slackToken) {
    throw new Error("--slack を使用するには .env に SLACK_TOKEN を設定してください");
  }
  if (args.confluence.length > 0 && (!config.confluenceToken || !config.confluenceBaseUrl || !config.confluenceEmail)) {
    throw new Error("--confluence を使用するには .env に CONFLUENCE_TOKEN, CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL を設定してください");
  }
  if (args.github.length > 0 && !config.githubToken) {
    throw new Error("--github を使用するには .env に GITHUB_TOKEN を設定してください");
  }

  const jiraInfo = parseJiraUrl(args.jira);
  console.log(`\nJiraチケット ${jiraInfo.issueKey} の要約を生成します\n`);

  // Step 1: Fetch data from all sources in parallel
  const sources = [
    args.slack.length > 0 ? `Slack(${args.slack.length}件)` : null,
    args.confluence.length > 0 ? `Confluence(${args.confluence.length}件)` : null,
    args.github.length > 0 ? `GitHub PR(${args.github.length}件)` : null,
  ].filter(Boolean);
  log("[1/4] データ取得", sources.length > 0 ? sources.join(", ") : "ソース指定なし");

  // Fetch all URLs in parallel
  const slackPromises = args.slack.map((url) =>
    fetchSlackThread(config.slackToken!, parseSlackUrl(url))
      .then((data) => ({ ok: true as const, data, url }))
      .catch((err) => ({ ok: false as const, err, url }))
  );
  const confluencePromises = args.confluence.map((url) =>
    fetchConfluencePage(
      config.confluenceBaseUrl!,
      config.confluenceEmail!,
      config.confluenceToken!,
      parseConfluenceUrl(url)
    )
      .then((data) => ({ ok: true as const, data, url }))
      .catch((err) => ({ ok: false as const, err, url }))
  );
  const githubPromises = args.github.map((url) =>
    fetchGitHubPr(config.githubToken!, parseGitHubPrUrl(url))
      .then((data) => ({ ok: true as const, data, url }))
      .catch((err) => ({ ok: false as const, err, url }))
  );

  const [slackResults, confluenceResults, githubResults] = await Promise.all([
    Promise.all(slackPromises),
    Promise.all(confluencePromises),
    Promise.all(githubPromises),
  ]);

  // Merge Slack data
  const slackMessages: SlackThreadData["messages"] = [];
  for (const r of slackResults) {
    if (r.ok) {
      log("  OK", `Slack: ${r.data.messages.length}件のメッセージ`);
      slackMessages.push(...r.data.messages);
    } else {
      console.warn(`  NG Slackデータ取得に失敗 (${r.url}): ${r.err}`);
    }
  }

  // Merge Confluence data
  const confluencePages: ConfluencePageData[] = [];
  for (const r of confluenceResults) {
    if (r.ok) {
      log("  OK", `Confluence: ${r.data.title}`);
      confluencePages.push(r.data);
    } else {
      console.warn(`  NG Confluenceデータ取得に失敗 (${r.url}): ${r.err}`);
    }
  }

  // Merge GitHub data
  const githubPrs: GitHubPrData[] = [];
  for (const r of githubResults) {
    if (r.ok) {
      log("  OK", `GitHub PR: ${r.data.title} (${r.data.changedFiles.length}ファイル変更)`);
      githubPrs.push(r.data);
    } else {
      console.warn(`  NG GitHubデータ取得に失敗 (${r.url}): ${r.err}`);
    }
  }

  // Step 2: If we have PRs, analyze impact
  let impactContext = "";
  if (githubPrs.length > 0) {
    log("[2/4] 影響範囲分析", "import先を収集中...");

    const allChangedFiles = [...new Set(githubPrs.flatMap((pr) => pr.changedFiles))];
    const allDiffs = githubPrs.map((pr) => pr.diff).join("\n");

    const importers = await collectImporters(
      config.localRepoPath,
      allChangedFiles
    );
    log("  OK", `${importers.length}件のimport元を検出`);

    const importerContents: Record<string, string> = {};
    for (const file of importers) {
      try {
        importerContents[file] = await getFileContent(config.localRepoPath, file);
      } catch {
        // File might not exist at HEAD
      }
    }

    log("  AI", "Claude で影響範囲を分析中（しばらくお待ちください）...");
    const impact = await analyzeImpact(
      allDiffs,
      allChangedFiles,
      importers,
      importerContents
    );
    log("  OK", `追加確認ファイル: ${impact.additionalFiles.length}件`);

    const additionalContents: string[] = [];
    for (const file of impact.additionalFiles) {
      try {
        const content = await getFileContent(config.localRepoPath, file);
        additionalContents.push(`### ${file}\n\`\`\`\n${content}\n\`\`\``);
      } catch {
        // File might not exist
      }
    }

    impactContext = additionalContents.join("\n\n");
  } else {
    log("[2/4] 影響範囲分析", "スキップ（GitHub PR未指定）");
  }

  // Step 3: AI ②: Generate summary
  log("[3/4] 要約生成", "Claude で要約を生成中（しばらくお待ちください）...");
  const slackContent = slackMessages.length > 0
    ? slackMessages.map((m) => `${m.user}: ${m.text}`).join("\n")
    : null;
  const confluenceContent = confluencePages.length > 0
    ? confluencePages.map((p) => `# ${p.title}\n${p.body}`).join("\n\n---\n\n")
    : null;
  const mergedGithub = githubPrs.length > 0
    ? {
        title: githubPrs.map((pr) => pr.title).join(" / "),
        description: githubPrs.map((pr) => pr.description).join("\n\n---\n\n"),
        diff: githubPrs.map((pr) => pr.diff).join("\n"),
        comments: [
          ...githubPrs.flatMap((pr) => pr.comments),
          ...githubPrs.flatMap((pr) =>
            pr.reviewComments.map((rc) => ({
              user: rc.user,
              body: `[${rc.path}] ${rc.body}`,
            }))
          ),
        ],
      }
    : null;

  const summary: Summary = await generateSummary(
    slackContent,
    confluenceContent,
    mergedGithub,
    impactContext
  );
  log("  OK", `要約完了: ${summary.title}`);

  // Step 4: Write to Jira or print (dry-run)
  if (args.dryRun) {
    log("[4/4] dry-run", "Jiraへの書き込みをスキップ");
    console.log(`\n${"=".repeat(50)}`);
    console.log(`[dry-run] ${jiraInfo.issueKey} への要約（書き込みなし）`);
    console.log(`${"=".repeat(50)}`);
    console.log(JSON.stringify(summary, null, 2));
    console.log(`${"=".repeat(50)}\n`);
  } else {
    log("[4/4] Jira書き込み", `${jiraInfo.issueKey} にコメント追加中...`);
    await addJiraComment(
      jiraInfo.baseUrl,
      config.jiraEmail,
      config.jiraToken,
      jiraInfo.issueKey,
      summary
    );
    console.log(`\n${"=".repeat(50)}`);
    console.log(`Done! ${jiraInfo.issueKey} に要約を書き込みました`);
    console.log(`タイトル: ${summary.title}`);
    console.log(`ステータス: ${summary.status}`);
    console.log(`${"=".repeat(50)}\n`);
  }
}
