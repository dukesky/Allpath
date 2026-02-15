import { NextRequest, NextResponse } from "next/server";
import { getAdapter } from "@/lib/providers";
import { ProviderType } from "@/lib/types";

export async function GET(request: NextRequest) {
  const providerType = (request.nextUrl.searchParams.get("providerType") as ProviderType | null) ?? "openrouter";
  const apiKey = request.nextUrl.searchParams.get("apiKey") ?? process.env.OPENROUTER_API_KEY ?? "";
  const baseUrl = request.nextUrl.searchParams.get("baseUrl") ?? undefined;

  try {
    const adapter = getAdapter({ type: providerType, apiKey, baseUrl });

    if (!adapter.listModels) {
      return NextResponse.json({ models: [] });
    }

    const models = await adapter.listModels({ type: providerType, apiKey, baseUrl });
    return NextResponse.json({ models });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message, models: [] },
      { status: 500 }
    );
  }
}
