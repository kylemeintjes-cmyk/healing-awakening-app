import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.LOCAL_LLM_BASE_URL;
  const model = process.env.LOCAL_LLM_MODEL ?? null;

  if (!baseUrl) {
    return NextResponse.json({
      up: false,
      model,
      reason: "LOCAL_LLM_BASE_URL is not configured.",
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${baseUrl}/models`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      return NextResponse.json({
        up: false,
        model,
        reason: `Model endpoint returned ${response.status}.`,
      });
    }
    const payload = await response.json();
    return NextResponse.json({
      up: true,
      model,
      payload,
    });
  } catch {
    return NextResponse.json({
      up: false,
      model,
      reason: "Unable to connect to local model server.",
    });
  } finally {
    clearTimeout(timeout);
  }
}
