import { NextRequest, NextResponse } from "next/server";
import { runHarness } from "@/lib/harness";

export const maxDuration = 300; // 5분 (Vercel Pro)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testCaseIds, promptVersion } = body as {
      testCaseIds?: string[];
      promptVersion?: string;
    };

    const logs: string[] = [];

    const summary = await runHarness({
      testCaseIds,
      promptVersion,
      onProgress: (msg) => logs.push(msg),
    });

    return NextResponse.json({
      success: true,
      summary,
      logs,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
