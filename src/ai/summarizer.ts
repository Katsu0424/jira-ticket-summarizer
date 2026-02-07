import type { Summary } from "../types.js";
import { buildSummaryPrompt } from "./prompts.js";
import { askClaude } from "./claude-cli.js";

const VALID_STATUSES = [
  "investigating",
  "in_progress",
  "resolved",
  "monitoring",
] as const;

export function validateSummary(data: unknown): Summary {
  if (typeof data !== "object" || data === null) {
    throw new Error("Summary must be an object");
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.title !== "string") throw new Error("title must be a string");
  if (typeof obj.background !== "string")
    throw new Error("background must be a string");
  if (typeof obj.problem !== "string")
    throw new Error("problem must be a string");
  if (typeof obj.impact !== "string")
    throw new Error("impact must be a string");
  if (obj.cause !== null && typeof obj.cause !== "string")
    throw new Error("cause must be a string or null");
  if (!Array.isArray(obj.actions))
    throw new Error("actions must be an array");
  if (!VALID_STATUSES.includes(obj.status as (typeof VALID_STATUSES)[number]))
    throw new Error(`status must be one of: ${VALID_STATUSES.join(", ")}`);
  if (!Array.isArray(obj.nextSteps))
    throw new Error("nextSteps must be an array");

  const qa = obj.qa as Record<string, unknown> | undefined;
  if (typeof qa !== "object" || qa === null)
    throw new Error("qa must be an object");
  if (!Array.isArray(qa.cautions))
    throw new Error("qa.cautions must be an array");
  if (!Array.isArray(qa.relatedFeatures))
    throw new Error("qa.relatedFeatures must be an array");

  return data as Summary;
}

export async function generateSummary(
  slackContent: string | null,
  confluenceContent: string | null,
  prData: {
    title: string;
    description: string;
    diff: string;
    comments: { user: string; body: string }[];
  } | null,
  impactContext: string
): Promise<Summary> {
  const prompt = buildSummaryPrompt(
    slackContent,
    confluenceContent,
    prData,
    impactContext
  );

  const text = await askClaude(prompt);
  const jsonMatch =
    text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/);

  if (!jsonMatch) {
    throw new Error("AI response did not contain valid JSON");
  }

  const parsed = JSON.parse(jsonMatch[1]);
  return validateSummary(parsed);
}
