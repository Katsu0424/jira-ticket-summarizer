import { spawn } from "node:child_process";

let claudeModel: string | undefined;

export function setClaudeModel(model: string | undefined): void {
  claudeModel = model;
}

export function askClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = ["-p"];
    if (claudeModel) {
      args.push("--model", claudeModel);
    }

    const proc = spawn("claude", args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("error", (err) => {
      reject(new Error(`claude コマンドの実行に失敗しました: ${err.message}`));
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`claude -p がエラーで終了しました (code ${code}): ${stderr}`));
      } else {
        resolve(stdout);
      }
    });

    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}
