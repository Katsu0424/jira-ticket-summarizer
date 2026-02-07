import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getDiff, getChangedFiles, getFileContent } from "../../src/utils/git.js";

const execFileAsync = promisify(execFile);

describe("git utils", () => {
  let repoPath: string;

  beforeAll(async () => {
    // Create a temp git repo with two commits
    repoPath = await mkdtemp(join(tmpdir(), "git-test-"));
    await execFileAsync("git", ["init"], { cwd: repoPath });
    await execFileAsync("git", ["config", "user.email", "test@test.com"], {
      cwd: repoPath,
    });
    await execFileAsync("git", ["config", "user.name", "Test"], {
      cwd: repoPath,
    });

    // First commit
    await writeFile(join(repoPath, "hello.txt"), "hello\n");
    await execFileAsync("git", ["add", "."], { cwd: repoPath });
    await execFileAsync("git", ["commit", "-m", "initial"], {
      cwd: repoPath,
    });

    // Create a branch
    await execFileAsync("git", ["checkout", "-b", "feature"], {
      cwd: repoPath,
    });

    // Second commit on branch
    await writeFile(join(repoPath, "hello.txt"), "hello world\n");
    await writeFile(join(repoPath, "new.txt"), "new file\n");
    await execFileAsync("git", ["add", "."], { cwd: repoPath });
    await execFileAsync("git", ["commit", "-m", "feature change"], {
      cwd: repoPath,
    });
  });

  afterAll(async () => {
    await rm(repoPath, { recursive: true, force: true });
  });

  it("getDiff should return diff between branches", async () => {
    const diff = await getDiff(repoPath, "main", "feature");
    expect(diff).toContain("hello world");
    expect(diff).toContain("new file");
  });

  it("getChangedFiles should return list of changed files", async () => {
    const files = await getChangedFiles(repoPath, "main", "feature");
    expect(files).toContain("hello.txt");
    expect(files).toContain("new.txt");
  });

  it("getFileContent should return file content at ref", async () => {
    const content = await getFileContent(repoPath, "hello.txt", "feature");
    expect(content).toBe("hello world\n");
  });

  it("getFileContent should return content from main", async () => {
    const content = await getFileContent(repoPath, "hello.txt", "main");
    expect(content).toBe("hello\n");
  });
});
