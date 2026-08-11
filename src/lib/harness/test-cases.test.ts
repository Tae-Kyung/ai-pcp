import { describe, it, expect } from "vitest";
import { TEST_CASES } from "./test-cases";

describe("TEST_CASES", () => {
  it("should have 5 test cases", () => {
    expect(TEST_CASES).toHaveLength(5);
  });

  it("should have unique IDs", () => {
    const ids = TEST_CASES.map((tc) => tc.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should cover different sectors", () => {
    const sectors = new Set(TEST_CASES.map((tc) => tc.sector));
    expect(sectors.size).toBeGreaterThanOrEqual(4);
  });

  it("should cover different countries", () => {
    const countries = new Set(TEST_CASES.map((tc) => tc.country));
    expect(countries.size).toBe(5);
  });

  it("should cover different difficulty levels", () => {
    const difficulties = new Set(TEST_CASES.map((tc) => tc.difficulty));
    expect(difficulties.size).toBeGreaterThanOrEqual(2);
  });

  it("should have valid input data for each case", () => {
    for (const tc of TEST_CASES) {
      expect(tc.input.projectTitle).toBeTruthy();
      expect(tc.input.requestingCountry).toBeTruthy();
      expect(tc.input.sector).toBeTruthy();
      expect(tc.input.problemStatement.length).toBeGreaterThan(50);
      expect(tc.input.estimatedBudget).toBeGreaterThan(0);
      expect(tc.input.sdgs.length).toBeGreaterThan(0);
      expect(tc.input.sdgs.every((s) => s >= 1 && s <= 17)).toBe(true);
    }
  });

  it("should have expectedMinScore of at least 70", () => {
    for (const tc of TEST_CASES) {
      expect(tc.expectedMinScore).toBeGreaterThanOrEqual(70);
    }
  });
});
