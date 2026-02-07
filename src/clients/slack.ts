import type { SlackThreadData, SlackUrlInfo } from "../types.js";

export async function fetchSlackThread(
  token: string,
  info: SlackUrlInfo
): Promise<SlackThreadData> {
  const url = new URL("https://slack.com/api/conversations.replies");
  url.searchParams.set("channel", info.channelId);
  url.searchParams.set("ts", info.threadTs);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Slack API error: ${res.status}`);
  }

  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }

  return {
    messages: data.messages.map((m: any) => ({
      user: m.user ?? "unknown",
      text: m.text ?? "",
      ts: m.ts,
    })),
  };
}
