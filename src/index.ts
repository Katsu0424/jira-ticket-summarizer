#!/usr/bin/env node
import { loadConfig } from "./config.js";
import { run } from "./orchestrator.js";
import type { CliArgs } from "./types.js";

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    jira: "",
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
      case "--help":
        printUsage();
        process.exit(0);
      default:
        console.error(`Unknown option: ${arg}`);
        printUsage();
        process.exit(1);
    }
  }

  if (!args.jira) {
    console.error("Error: --jira is required");
    printUsage();
    process.exit(1);
  }

  return args;
}

function printUsage(): void {
  console.log(`Usage: summarize --jira <URL> [options]

Options:
  --jira <URL>          Jira ticket URL (required)
  --slack <URL>         Slack thread URL (複数指定可)
  --confluence <URL>    Confluence page URL (複数指定可)
  --github <URL>        GitHub PR URL (複数指定可)
  --dry-run             Jiraに書き込まず要約をターミナルに表示
  --help                Show this help message

Examples:
  summarize --jira https://xxx.atlassian.net/browse/PROJ-123 --github https://github.com/org/repo/pull/1
  summarize --jira https://xxx.atlassian.net/browse/PROJ-123 --github https://github.com/org/repo/pull/1 --dry-run`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  const config = loadConfig();
  await run(args, config);
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
