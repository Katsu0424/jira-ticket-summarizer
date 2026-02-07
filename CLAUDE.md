# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Slack・Confluence・GitHub PRの情報を入力し、AIが非エンジニアにもわかりやすく要約して、指定のJiraチケットに自動書き込みするCLIツール。

## 技術選定（決定済み）

| 項目 | 技術 |
|------|------|
| 言語 | TypeScript |
| ランタイム | Node.js |
| パッケージマネージャー | npm |
| CLIパーサー | 素のprocess.argv（フレームワーク不使用） |
| テスト | Vitest |
| AI | Anthropic Claude API |
| 設定 | `.env`（トークン類 + ローカルリポジトリパス） |

## CLI インターフェース

```bash
$ summarize \
  --slack https://xxx.slack.com/archives/C123/p456 \
  --confluence https://xxx.atlassian.net/wiki/pages/123 \
  --github https://github.com/org/repo/pull/456 \
  --jira PROJ-123
```

- `--jira` のみ必須、他はオプショナル
- 入力はすべてURL指定で統一
- ローカルリポジトリのパスは `.env` の `LOCAL_REPO_PATH` で設定

## 設計方針

- **AIの役割は最小限**: AIは「要約」と「影響範囲分析」の2箇所のみ。それ以外はスクリプトで確定動作
- **ローカル実行**: 自分のAPIトークンで動かす
- **リポジトリはローカルclone前提**: Git diff・周辺コード取得のため

## 処理フロー

```
[スクリプト] Slack API → スレッド内容取得
[スクリプト] Confluence REST API → ページ内容取得
[スクリプト] GitHub API → PR情報取得（diff, description, コメント）
[スクリプト] 変更ファイルのimport先を機械的に収集
[AI ①]     diff + 周辺コードから影響範囲を判定 → 追加で見るべきファイルを返す
[スクリプト] 指示されたファイルを取得
[AI ②]     全情報をまとめて要約 → Summary型で出力
[スクリプト] Jira REST API → チケットに書き込み
```

## AI処理の設計

### AI ①: 影響範囲分析
- **入力**: diff + 変更ファイルのimport先（機械的に収集済み）
- **出力**: 追加で確認すべきファイルパスのリスト
- スクリプトから見ると「コードを入れたら関連ファイルリストが返る関数」

### AI ②: 要約生成
- **入力**: Slack内容 + Confluenceページ + PR情報 + 影響範囲のコード
- **出力**: `Summary` 型のJSON

## 出力型定義

```typescript
type Summary = {
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
```

## 必要なトークン（.envに設定）

- `SLACK_TOKEN` - Slack User Token（スレッド読み取り）
- `CONFLUENCE_TOKEN` - Confluence API Token（ページ取得）
- `CONFLUENCE_BASE_URL` - Confluence のベースURL
- `CONFLUENCE_EMAIL` - Confluence のメールアドレス
- `JIRA_TOKEN` - Jira API Token（チケット書き込み）
- `JIRA_BASE_URL` - Jira のベースURL
- `JIRA_EMAIL` - Jira のメールアドレス
- `GITHUB_TOKEN` - GitHub Token（PR情報取得）
- `ANTHROPIC_API_KEY` - Anthropic API Key（要約処理）
- `LOCAL_REPO_PATH` - ローカルリポジトリのパス

## 想定ディレクトリ構成

```
src/
  index.ts                  # CLIエントリーポイント（process.argvパース）
  types.ts                  # Summary型・共有型定義
  clients/
    slack.ts                # Slack API クライアント
    confluence.ts           # Confluence REST API クライアント
    github.ts               # GitHub API クライアント
    jira.ts                 # Jira REST API クライアント
  collectors/
    import-collector.ts     # 変更ファイルのimport先を機械的に収集
  ai/
    impact-analysis.ts      # AI①: 影響範囲分析
    summarizer.ts           # AI②: 要約生成
    prompts.ts              # プロンプトテンプレート管理
  utils/
    url-parser.ts           # 各サービスURLのパース
    git.ts                  # Git操作（diff取得、ファイル読み取り）
```

## ビルド・テストコマンド（セットアップ後）

```bash
npm run build          # TypeScriptコンパイル
npm run dev            # 開発実行（ts-node or tsx）
npm test               # 全テスト実行
npx vitest run <file>  # 単一テスト実行
```

## 現在のステータス

リポジトリは初期化直後。これから実装を開始する段階。
