# jira-ticket-summarizer

Slack・Confluence・GitHub PRの情報をAIで要約し、Jiraチケットにコメントとして自動書き込みするCLIツール。

## どんなツール？

開発チケットに散らばった情報（Slackでの議論、Confluenceの設計ドキュメント、GitHubのPR）をAIが統合・要約し、非エンジニアにもわかりやすい形でJiraチケットに自動投稿します。

**実行例:**

```
$ summarize \
    --jira https://katsutoshi1156.atlassian.net/browse/KAN-4 \
    --github https://github.com/Katsu0424/learning-product-service/pull/6

Jiraチケット KAN-4 の要約を生成します

[16:04:31] [1/4] データ取得 GitHub PR(1件)
[16:04:33]   OK GitHub PR: fix: 割引計算の順序を修正（税込後割引→税抜後割引） (4ファイル変更)
[16:04:33] [2/4] 影響範囲分析 import先を収集中...
[16:04:34]   OK 3件のimport元を検出
[16:04:34]   AI Claude で影響範囲を分析中（しばらくお待ちください）...
[16:05:13]   OK 追加確認ファイル: 2件
[16:05:13] [3/4] 要約生成 Claude で要約を生成中（しばらくお待ちください）...
[16:06:02]   OK 要約完了: 割引計算ロジックの修正（税込後割引→税抜後割引）
[16:06:02] [4/4] Jira書き込み KAN-4 にコメント追加中...

==================================================
Done! KAN-4 に要約を書き込みました
タイトル: 割引計算ロジックの修正（税込後割引→税抜後割引）
ステータス: resolved
==================================================
```

## セットアップ

### 前提条件

- Node.js 18+
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) がインストール済みで `claude` コマンドが使えること
  - AI要約はClaude CLIのパイプモード（`claude -p`）経由で実行されるため、別途API料金は不要

### インストール

```bash
git clone <this-repo>
cd jira-ticket-summarizer
npm install
npm run build
npm link          # summarize コマンドをグローバルに登録
```

### 環境変数の設定

```bash
cp .env.example .env
```

`.env` を編集して必要なトークンを設定します。

#### 必須

| 変数 | 説明 |
|------|------|
| `JIRA_TOKEN` | Jira API Token（[取得方法](https://id.atlassian.com/manage-profile/security/api-tokens)） |
| `JIRA_EMAIL` | Jira に登録しているメールアドレス |
| `LOCAL_REPO_PATH` | 対象リポジトリのローカルパス（git cloneしたディレクトリ） |

#### オプション（使用するソースに応じて設定）

| 変数 | 用途 |
|------|------|
| `SLACK_TOKEN` | `--slack` 使用時に必要。Slack User Token（[作成手順](https://api.slack.com/apps)でBot/User Tokenを発行） |
| `CONFLUENCE_TOKEN` | `--confluence` 使用時に必要 |
| `CONFLUENCE_BASE_URL` | Confluence のベースURL（例: `https://xxx.atlassian.net/wiki`） |
| `CONFLUENCE_EMAIL` | Confluence のメールアドレス |
| `GITHUB_TOKEN` | `--github` 使用時に必要。[Personal Access Token](https://github.com/settings/tokens) |
| `CLAUDE_MODEL` | AIモデルの指定（例: `sonnet`, `opus`, `haiku`）。未指定時はデフォルト |

## 使い方

```bash
# GitHub PR のみ
summarize \
  --jira https://xxx.atlassian.net/browse/PROJ-123 \
  --github https://github.com/org/repo/pull/456

# 全ソース指定
summarize \
  --jira https://xxx.atlassian.net/browse/PROJ-123 \
  --slack https://xxx.slack.com/archives/C123/p456 \
  --confluence https://xxx.atlassian.net/wiki/spaces/DEV/pages/789/Page \
  --github https://github.com/org/repo/pull/456

# 複数URLも指定可能（同じフラグを繰り返す）
summarize \
  --jira https://xxx.atlassian.net/browse/PROJ-123 \
  --github https://github.com/org/repo/pull/1 \
  --github https://github.com/org/repo/pull/2 \
  --slack https://xxx.slack.com/archives/C123/p111 \
  --slack https://xxx.slack.com/archives/C456/p222
```

### オプション一覧

| フラグ | 必須 | 説明 |
|--------|------|------|
| `--jira <URL>` | Yes | Jiraチケット URL |
| `--slack <URL>` | No | Slackスレッド URL（複数指定可） |
| `--confluence <URL>` | No | Confluenceページ URL（複数指定可） |
| `--github <URL>` | No | GitHub PR URL（複数指定可） |
| `--dry-run` | No | Jiraに書き込まず要約をターミナルに表示 |
| `--help` | - | ヘルプ表示 |

## 処理フロー

```
[1/4] データ取得      Slack / Confluence / GitHub PR の情報を並列取得
[2/4] 影響範囲分析    変更ファイルのimport先を収集 → AIで追加確認ファイルを特定
[3/4] 要約生成        全情報を統合してAIが要約（Summary型JSON）
[4/4] Jira書き込み    チケットにコメントとして投稿
```

## Jiraに書き込まれる内容

以下のセクションが構造化されたコメントとして投稿されます:

- **タイトル** - 変更の簡潔な要約
- **背景** - この変更が必要になった経緯
- **問題** - 解決しようとしている問題
- **影響範囲** - 変更による影響
- **原因** - 根本原因（バグ修正の場合）
- **対応内容** - 実施した対応のリスト
- **ステータス** - investigating / in_progress / resolved / monitoring
- **次のステップ** - 残タスクやフォローアップ
- **QA注意事項** - テスト時の注意点と関連機能

## 開発

```bash
npm run build          # TypeScriptコンパイル
npm test               # 全テスト実行（58テスト）
npx vitest run <file>  # 単一テスト実行
```

### ディレクトリ構成

```
src/
  index.ts                  # CLIエントリーポイント
  config.ts                 # 環境変数読み込み
  types.ts                  # 共有型定義
  orchestrator.ts           # パイプライン統合
  clients/
    slack.ts                # Slack API クライアント
    confluence.ts           # Confluence REST API クライアント
    github.ts               # GitHub API クライアント
    jira.ts                 # Jira REST API クライアント（ADF形式）
  collectors/
    import-collector.ts     # git grep による import 元収集
  ai/
    claude-cli.ts           # Claude CLI（claude -p）呼び出し
    prompts.ts              # プロンプトテンプレート管理
    impact-analysis.ts      # AI: 影響範囲分析
    summarizer.ts           # AI: 要約生成 + バリデーション
  utils/
    url-parser.ts           # 各サービスURLのパース
    git.ts                  # Git操作（diff取得、ファイル読み取り）
```

## 技術スタック

TypeScript / Node.js / Claude Code CLI / Vitest
