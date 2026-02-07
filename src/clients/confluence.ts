import type { ConfluencePageData, ConfluenceUrlInfo } from "../types.js";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchConfluencePage(
  baseUrl: string,
  email: string,
  token: string,
  info: ConfluenceUrlInfo
): Promise<ConfluencePageData> {
  const apiUrl = `${baseUrl}/rest/api/content/${info.pageId}?expand=body.storage`;
  const auth = Buffer.from(`${email}:${token}`).toString("base64");

  const res = await fetch(apiUrl, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Confluence API error: ${res.status}`);
  }

  const data = await res.json();
  return {
    title: data.title,
    body: stripHtml(data.body.storage.value),
  };
}
