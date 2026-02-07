import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function getDiff(
  repoPath: string,
  base: string,
  head: string
): Promise<string> {
  const { stdout } = await execFileAsync(
    "git",
    ["diff", `${base}...${head}`],
    { cwd: repoPath, maxBuffer: 10 * 1024 * 1024 }
  );
  return stdout;
}

export async function getChangedFiles(
  repoPath: string,
  base: string,
  head: string
): Promise<string[]> {
  const { stdout } = await execFileAsync(
    "git",
    ["diff", "--name-only", `${base}...${head}`],
    { cwd: repoPath }
  );
  return stdout.trim().split("\n").filter(Boolean);
}

export async function getFileContent(
  repoPath: string,
  filePath: string,
  ref: string = "HEAD"
): Promise<string> {
  const { stdout } = await execFileAsync(
    "git",
    ["show", `${ref}:${filePath}`],
    { cwd: repoPath }
  );
  return stdout;
}
