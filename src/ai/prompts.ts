export function buildImpactAnalysisPrompt(
  diff: string,
  changedFiles: string[],
  importers: string[],
  importerContents: Record<string, string>
): string {
  const importerSection = Object.entries(importerContents)
    .map(([path, content]) => `### ${path}\n\`\`\`\n${content}\n\`\`\``)
    .join("\n\n");

  return `あなたはシニアソフトウェアエンジニアだ。以下のコード変更の影響範囲を分析してほしい。

## 変更差分
\`\`\`diff
${diff}
\`\`\`

## 変更ファイル
${changedFiles.map((f) => `- ${f}`).join("\n")}

## 変更ファイルをimportしているファイル
${importers.map((f) => `- ${f}`).join("\n")}

## importしているファイルの内容
${importerSection}

## タスク
上記の変更によって影響を受ける可能性があるが、まだ確認できていないファイルのパスをリストアップしてほしい。
既に上記に含まれているファイルは除外すること。

以下のJSON形式で回答すること:
\`\`\`json
{
  "additionalFiles": ["path/to/file1.ts", "path/to/file2.ts"]
}
\`\`\`

追加で確認すべきファイルがない場合は空配列を返すこと。`;
}

export function buildSummaryPrompt(
  slackContent: string | null,
  confluenceContent: string | null,
  prData: { title: string; description: string; diff: string; comments: { user: string; body: string }[] } | null,
  impactContext: string
): string {
  const sections: string[] = [];

  if (slackContent) {
    sections.push(`## Slackスレッド\n${slackContent}`);
  }

  if (confluenceContent) {
    sections.push(`## Confluenceページ\n${confluenceContent}`);
  }

  if (prData) {
    const commentsStr = prData.comments
      .map((c) => `${c.user}: ${c.body}`)
      .join("\n");
    sections.push(
      `## Pull Request: ${prData.title}\n### 説明\n${prData.description}\n### 差分\n\`\`\`diff\n${prData.diff}\n\`\`\`\n### コメント\n${commentsStr}`
    );
  }

  if (impactContext) {
    sections.push(`## 影響範囲のコード\n${impactContext}`);
  }

  return `あなたはシニアソフトウェアエンジニアで、非エンジニアにもわかりやすく技術的な変更を説明できる。

以下の情報を元に、Jiraチケットの要約を作成してほしい。

${sections.join("\n\n")}

## 文体
- 敬語は使わず、「〜だ」「〜である」「〜した」のような常体（だ・である調）で書くこと
- 簡潔でわかりやすい表現にすること

## 出力形式
以下のJSON形式で出力すること。日本語で記述すること。

\`\`\`json
{
  "title": "変更の簡潔なタイトル",
  "background": "この変更が必要になった背景",
  "problem": "解決しようとしている問題",
  "impact": "この変更による影響範囲",
  "cause": "問題の根本原因（バグ修正の場合）またはnull",
  "actions": ["実施した対応1", "実施した対応2"],
  "status": "investigating | in_progress | resolved | monitoring",
  "nextSteps": ["次のステップ1", "次のステップ2"],
  "qa": {
    "cautions": ["QAで注意すべき点1"],
    "relatedFeatures": ["関連する機能1"]
  }
}
\`\`\``;
}
