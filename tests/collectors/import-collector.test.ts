import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { collectImporters } from "../../src/collectors/import-collector.js";

const execFileAsync = promisify(execFile);

describe("collectImporters", () => {
  let repoPath: string;

  beforeAll(async () => {
    repoPath = await mkdtemp(join(tmpdir(), "import-test-"));
    await execFileAsync("git", ["init"], { cwd: repoPath });
    await execFileAsync("git", ["config", "user.email", "test@test.com"], { cwd: repoPath });
    await execFileAsync("git", ["config", "user.name", "Test"], { cwd: repoPath });

    // Create source files
    await mkdir(join(repoPath, "src", "utils"), { recursive: true });
    await mkdir(join(repoPath, "src", "components"), { recursive: true });

    await writeFile(
      join(repoPath, "src/utils/helper.ts"),
      'export function helper() { return "help"; }\n'
    );
    await writeFile(
      join(repoPath, "src/components/app.ts"),
      'import { helper } from "../utils/helper";\nconsole.log(helper());\n'
    );
    await writeFile(
      join(repoPath, "src/index.ts"),
      'import { helper } from "./utils/helper";\nhelper();\n'
    );
    await writeFile(
      join(repoPath, "src/unrelated.ts"),
      'console.log("no imports here");\n'
    );

    await execFileAsync("git", ["add", "."], { cwd: repoPath });
    await execFileAsync("git", ["commit", "-m", "init"], { cwd: repoPath });
  });

  afterAll(async () => {
    await rm(repoPath, { recursive: true, force: true });
  });

  it("should find files that import the changed file", async () => {
    const result = await collectImporters(repoPath, ["src/utils/helper.ts"]);
    expect(result).toContain("src/components/app.ts");
    expect(result).toContain("src/index.ts");
    expect(result).not.toContain("src/unrelated.ts");
    // Should not include the changed file itself
    expect(result).not.toContain("src/utils/helper.ts");
  });

  it("should return empty array when no files import the changed file", async () => {
    const result = await collectImporters(repoPath, ["src/unrelated.ts"]);
    expect(result).toEqual([]);
  });

  it("should handle multiple changed files", async () => {
    const result = await collectImporters(repoPath, [
      "src/utils/helper.ts",
      "src/unrelated.ts",
    ]);
    expect(result.length).toBeGreaterThan(0);
  });
});
