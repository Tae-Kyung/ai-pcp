import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

const RESULTS_DIR = path.join(process.cwd(), "harness-results");

export async function GET() {
  try {
    if (!fs.existsSync(RESULTS_DIR)) {
      return NextResponse.json({ results: [] });
    }

    const files = fs.readdirSync(RESULTS_DIR)
      .filter((f) => f.startsWith("run-") && f.endsWith(".json"))
      .sort()
      .reverse()
      .slice(0, 20); // 최근 20개

    const results = files.map((file) => {
      const content = fs.readFileSync(path.join(RESULTS_DIR, file), "utf-8");
      return JSON.parse(content);
    });

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
