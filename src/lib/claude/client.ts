import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export const MODELS = {
  fast: "claude-haiku-4-5-20251001" as const,
  standard: "claude-sonnet-4-5-20250929" as const,
} as const;

export type ModelType = keyof typeof MODELS;
