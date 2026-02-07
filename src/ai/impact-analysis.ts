import type { ImpactAnalysisResult } from "../types.js";
import { buildImpactAnalysisPrompt } from "./prompts.js";
import { askClaude } from "./claude-cli.js";

export async function analyzeImpact(
  diff: string,
  changedFiles: string[],
  importers: string[],
  importerContents: Record<string, string>
): Promise<ImpactAnalysisResult> {
  const prompt = buildImpactAnalysisPrompt(
    diff,
    changedFiles,
    importers,
    importerContents
  );

  const text = await askClaude(prompt);
  const jsonMatch =
    text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/);

  if (!jsonMatch) {
    return { additionalFiles: [] };
  }

  try {
    const parsed = JSON.parse(jsonMatch[1]);
    return {
      additionalFiles: Array.isArray(parsed.additionalFiles)
        ? parsed.additionalFiles
        : [],
    };
  } catch {
    return { additionalFiles: [] };
  }
}
