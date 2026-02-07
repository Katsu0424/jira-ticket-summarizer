import { describe, it, expect } from "vitest";
import { validateSummary } from "./summarizer.js";

const validSummary = {
  title: "テスト変更",
  background: "テストの背景",
  problem: "テストの問題",
  impact: "テストの影響",
  cause: "テストの原因",
  actions: ["対応1", "対応2"],
  status: "resolved" as const,
  nextSteps: ["ステップ1"],
  qa: {
    cautions: ["注意点1"],
    relatedFeatures: ["機能1"],
  },
};

describe("validateSummary", () => {
  it("should accept a valid summary", () => {
    const result = validateSummary(validSummary);
    expect(result.title).toBe("テスト変更");
    expect(result.status).toBe("resolved");
  });

  it("should accept null cause", () => {
    const result = validateSummary({ ...validSummary, cause: null });
    expect(result.cause).toBeNull();
  });

  it("should accept all valid statuses", () => {
    for (const status of [
      "investigating",
      "in_progress",
      "resolved",
      "monitoring",
    ]) {
      expect(() =>
        validateSummary({ ...validSummary, status })
      ).not.toThrow();
    }
  });

  it("should reject non-object", () => {
    expect(() => validateSummary("string")).toThrow("must be an object");
    expect(() => validateSummary(null)).toThrow("must be an object");
  });

  it("should reject missing title", () => {
    const { title, ...rest } = validSummary;
    expect(() => validateSummary(rest)).toThrow("title must be a string");
  });

  it("should reject invalid status", () => {
    expect(() =>
      validateSummary({ ...validSummary, status: "invalid" })
    ).toThrow("status must be one of");
  });

  it("should reject non-array actions", () => {
    expect(() =>
      validateSummary({ ...validSummary, actions: "not array" })
    ).toThrow("actions must be an array");
  });

  it("should reject missing qa", () => {
    expect(() =>
      validateSummary({ ...validSummary, qa: null })
    ).toThrow("qa must be an object");
  });

  it("should reject missing qa.cautions", () => {
    expect(() =>
      validateSummary({
        ...validSummary,
        qa: { relatedFeatures: [] },
      })
    ).toThrow("qa.cautions must be an array");
  });
});
