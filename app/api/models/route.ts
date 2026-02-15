import { NextRequest, NextResponse } from "next/server";
import { CatalogModel, PriceTier } from "@/lib/modelCatalog";
import { ProviderType } from "@/lib/types";

const CUTOFF_UNIX = Math.floor(new Date("2025-03-01T00:00:00Z").getTime() / 1000);

function toPriceTier(prompt: number, completion: number): PriceTier {
  const avg = (prompt + completion) / 2;

  if (avg <= 0.0000015) {
    return "$";
  }

  if (avg <= 0.00001) {
    return "$$";
  }

  return "$$$";
}

function isAllowedModelId(modelId: string): boolean {
  return (
    modelId.startsWith("openai/") ||
    modelId.startsWith("anthropic/") ||
    modelId.startsWith("google/gemini") ||
    modelId.startsWith("minimax/") ||
    modelId.startsWith("z-ai/") ||
    modelId.startsWith("qwen/")
  );
}

export async function GET(request: NextRequest) {
  const providerType = (request.nextUrl.searchParams.get("providerType") as ProviderType | null) ?? "openrouter";

  if (providerType !== "openrouter") {
    return NextResponse.json({ models: [] });
  }

  const apiKey = request.nextUrl.searchParams.get("apiKey") ?? process.env.OPENROUTER_API_KEY ?? "";

  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`OpenRouter models request failed: ${response.status}`);
    }

    const json = (await response.json()) as {
      data?: Array<{
        id: string;
        name?: string;
        created?: number;
        pricing?: { prompt?: string; completion?: string };
      }>;
    };

    const models: CatalogModel[] = (json.data ?? [])
      .filter((model) => (model.created ?? 0) >= CUTOFF_UNIX)
      .filter((model) => isAllowedModelId(model.id))
      .filter((model) => !model.id.includes(":free"))
      .map((model) => {
        const prompt = Number(model.pricing?.prompt ?? "0");
        const completion = Number(model.pricing?.completion ?? "0");

        return {
          id: model.id,
          label: model.name?.trim() || model.id,
          price: toPriceTier(prompt, completion)
        };
      })
      .sort((a, b) => a.id.localeCompare(b.id));

    return NextResponse.json({ models });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message, models: [] },
      { status: 500 }
    );
  }
}
