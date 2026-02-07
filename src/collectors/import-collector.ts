import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { basename } from "node:path";

const execFileAsync = promisify(execFile);

/**
 * Given a list of changed file paths, find all files in the repo that import them.
 * Uses `git grep` for fast searching within the git repository.
 */
export async function collectImporters(
  repoPath: string,
  changedFiles: string[]
): Promise<string[]> {
  const importers = new Set<string>();

  for (const file of changedFiles) {
    // Build search patterns for the changed file
    // e.g., for "src/utils/helper.ts", search for imports of "utils/helper" or "./helper"
    const withoutExt = file.replace(/\.(ts|tsx|js|jsx)$/, "");
    const baseName = basename(withoutExt);

    // Search for import/require statements referencing this file
    const patterns = [withoutExt, baseName];

    for (const pattern of patterns) {
      try {
        const { stdout } = await execFileAsync(
          "git",
          ["grep", "-l", "--untracked", "-E", `(import|require).*['"].*${escapeRegex(pattern)}['"]`],
          { cwd: repoPath }
        );
        for (const line of stdout.trim().split("\n")) {
          if (line && line !== file) {
            importers.add(line);
          }
        }
      } catch {
        // git grep exits with 1 when no matches found - this is normal
      }
    }
  }

  return [...importers];
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
