import type { Summary } from "../types.js";

function summaryToAdf(summary: Summary): object {
  const statusLabels: Record<Summary["status"], string> = {
    investigating: "調査中",
    in_progress: "対応中",
    resolved: "解決済み",
    monitoring: "経過観察中",
  };

  const sections: object[] = [
    heading(summary.title),
    heading("背景", 2),
    paragraph(summary.background),
    heading("問題", 2),
    paragraph(summary.problem),
    heading("影響範囲", 2),
    paragraph(summary.impact),
  ];

  if (summary.cause) {
    sections.push(heading("原因", 2), paragraph(summary.cause));
  }

  sections.push(
    heading("対応内容", 2),
    bulletList(summary.actions),
    heading("ステータス", 2),
    paragraph(statusLabels[summary.status]),
    heading("次のステップ", 2),
    bulletList(summary.nextSteps),
    heading("QA注意事項", 2),
    heading("注意点", 3),
    bulletList(summary.qa.cautions),
    heading("関連機能", 3),
    bulletList(summary.qa.relatedFeatures)
  );

  return {
    version: 1,
    type: "doc",
    content: sections,
  };
}

function heading(text: string, level: number = 1): object {
  return {
    type: "heading",
    attrs: { level },
    content: [{ type: "text", text }],
  };
}

function paragraph(text: string): object {
  return {
    type: "paragraph",
    content: [{ type: "text", text }],
  };
}

function bulletList(items: string[]): object {
  return {
    type: "bulletList",
    content: items.map((item) => ({
      type: "listItem",
      content: [paragraph(item)],
    })),
  };
}

export async function addJiraComment(
  baseUrl: string,
  email: string,
  token: string,
  issueKey: string,
  summary: Summary
): Promise<void> {
  const apiUrl = `${baseUrl}/rest/api/3/issue/${issueKey}/comment`;
  const auth = Buffer.from(`${email}:${token}`).toString("base64");

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      body: summaryToAdf(summary),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jira API error: ${res.status} - ${text}`);
  }
}
