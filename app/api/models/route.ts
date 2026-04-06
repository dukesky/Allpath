import { NextRequest, NextResponse } from "next/server";
import { CatalogModel, PriceTier } from "@/lib/modelCatalog";
import { ProviderType } from "@/lib/types";

function toPriceTier(prompt: number, completion: number): PriceTier {
  const avg = (prompt + completion) / 2;
  if (avg <= 0.0000015) return "$";
  if (avg <= 0.00001) return "$$";
  return "$$$";
}

// Strip variant suffixes to get the base model ID for grouping.
// e.g. "google/gemini-2.5-flash:free" -> "google/gemini-2.5-flash"
function baseModelId(id: string): string {
  return id.split(":")[0] ?? id;
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

    const minCreatedUnix = Math.floor(new Date("2025-03-01T00:00:00Z").getTime() / 1000);

    const raw = (json.data ?? [])
      .filter((model) => !!model.id)
      .filter((model) => !model.created || model.created >= minCreatedUnix);

    // Count how many models share each base ID (proxy for popularity/adoption).
    const variantCounts = new Map<string, number>();
    for (const model of raw) {
      const base = baseModelId(model.id);
      variantCounts.set(base, (variantCounts.get(base) ?? 0) + 1);
    }

    const models: CatalogModel[] = raw
      .map((model) => {
        const prompt = Number(model.pricing?.prompt ?? "0");
        const completion = Number(model.pricing?.completion ?? "0");
        return {
          id: model.id,
          label: model.name?.trim() || model.id,
          price: toPriceTier(prompt, completion),
          created: model.created ?? 0,
          variantCount: variantCounts.get(baseModelId(model.id)) ?? 1,
        };
      })
      .sort((a, b) => {
        if ((b.created ?? 0) !== (a.created ?? 0)) return (b.created ?? 0) - (a.created ?? 0);
        return a.id.localeCompare(b.id);
      })
      .slice(0, 500);

    return NextResponse.json({ models });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message, models: [] },
      { status: 500 }
    );
  }
}
