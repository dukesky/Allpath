# Model Picker Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add company filter, search, and New/Popular badges to the model picker; enrich the catalog with `created` and `variantCount` fields.

**Architecture:** Three layers — catalog data (`lib/modelCatalog.ts` + `app/api/models/route.ts` + generated JSON), badge logic (pure functions in `lib/modelCatalog.ts`), and UI (`app/chat/ModelPicker.tsx` extracted from `app/chat/page.tsx`). The quick-start model pills in `page.tsx` are a separate inline usage that also gets badges applied.

**Tech Stack:** TypeScript, React 19, Next.js 15 App Router, Tailwind CSS. No new dependencies.

---

## File Map

| File | Role |
|------|------|
| `lib/modelCatalog.ts` | Add `created?`/`variantCount?` to `CatalogModel`; add `POPULAR_MODEL_IDS`, `isNew()`, `isPopular()`, `providerFromId()`, `providerLabel()`; update `FEATURED_MODELS` |
| `app/api/models/route.ts` | Keep `created` in output; compute `variantCount` |
| `lib/generated/openrouterModels.json` | Regenerated with `created` + `variantCount` fields |
| `app/chat/ModelPicker.tsx` | New file — extracted + enhanced component |
| `app/chat/page.tsx` | Remove inline `ModelPicker` definition; import from new file; add badges to quick-start pills |

---

## Task 1: Enrich `CatalogModel` type and add badge helpers

**Files:**
- Modify: `lib/modelCatalog.ts`

- [ ] **Step 1: Update `CatalogModel` interface and add badge helpers**

Replace the contents of `lib/modelCatalog.ts` with:

```typescript
import generatedCatalog from "@/lib/generated/openrouterModels.json";

export type PriceTier = "$" | "$$" | "$$$";

export interface CatalogModel {
  id: string;
  label: string;
  price: PriceTier;
  created?: number;
  variantCount?: number;
}

export const POPULAR_MODEL_IDS = new Set([
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "openai/o3-mini",
  "openai/o1",
  "anthropic/claude-3.5-sonnet",
  "anthropic/claude-3.5-haiku",
  "anthropic/claude-3-opus",
  "google/gemini-2.0-flash",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "meta-llama/llama-3.3-70b-instruct",
  "meta-llama/llama-3.1-8b-instruct",
  "deepseek/deepseek-r1",
  "deepseek/deepseek-chat",
  "mistralai/mistral-large",
  "mistralai/mistral-nemo",
  "qwen/qwen-2.5-72b-instruct",
  "x-ai/grok-2-1212",
]);

const NEW_WINDOW_DAYS = 60;

export function isNew(model: CatalogModel): boolean {
  if (!model.created) return false;
  const cutoffSec = Date.now() / 1000 - NEW_WINDOW_DAYS * 86400;
  return model.created >= cutoffSec;
}

export function isPopular(model: CatalogModel): boolean {
  return POPULAR_MODEL_IDS.has(model.id) || (model.variantCount ?? 0) >= 3;
}

export function providerFromId(modelId: string): string {
  return modelId.split("/")[0] ?? modelId;
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  "meta-llama": "Meta",
  deepseek: "DeepSeek",
  mistralai: "Mistral",
  qwen: "Qwen",
  "x-ai": "xAI",
  cohere: "Cohere",
  "01-ai": "01.AI",
  microsoft: "Microsoft",
  nvidia: "NVIDIA",
  minimax: "MiniMax",
  "z-ai": "Z.AI",
  moonshotai: "Moonshot",
};

export function providerLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider;
}

export const FEATURED_MODELS: CatalogModel[] = [
  { id: "openai/gpt-4o-mini", label: "GPT-4o mini", price: "$" },
  { id: "openai/gpt-4o", label: "GPT-4o", price: "$$" },
  { id: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku", price: "$" },
  { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet", price: "$$" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", price: "$" },
  { id: "google/gemini-2.0-flash", label: "Gemini 2.0 Flash", price: "$" },
  { id: "deepseek/deepseek-r1", label: "DeepSeek R1", price: "$" },
  { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B", price: "$" },
];

const FALLBACK_MORE_MODELS: CatalogModel[] = [
  { id: "openai/o3-mini", label: "OpenAI o3-mini", price: "$$" },
  { id: "openai/o1", label: "OpenAI o1", price: "$$$" },
  { id: "anthropic/claude-3-opus", label: "Claude 3 Opus", price: "$$$" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", price: "$$" },
  { id: "mistralai/mistral-large", label: "Mistral Large", price: "$$" },
  { id: "x-ai/grok-2-1212", label: "Grok 2", price: "$$" },
  { id: "qwen/qwen-2.5-72b-instruct", label: "Qwen 2.5 72B", price: "$" },
  { id: "meta-llama/llama-3.1-8b-instruct", label: "Llama 3.1 8B", price: "$" },
];

const generatedModels = ((generatedCatalog as { models?: CatalogModel[] }).models ?? []).filter(
  (model) => !!model?.id && !!model?.label && !!model?.price
);
const featuredIds = new Set(FEATURED_MODELS.map((model) => model.id));
const generatedMoreModels = generatedModels.filter((model) => !featuredIds.has(model.id));

export const MORE_MODELS: CatalogModel[] =
  generatedMoreModels.length > 0 ? generatedMoreModels : FALLBACK_MORE_MODELS;

export function modelPriceTag(modelId: string): PriceTier | "?" {
  const found = [...FEATURED_MODELS, ...MORE_MODELS].find((model) => model.id === modelId);
  return found?.price ?? "?";
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Step 3: Commit**

```bash
git add lib/modelCatalog.ts
git commit -m "feat: enrich CatalogModel with created/variantCount fields and add badge helpers"
```

---

## Task 2: Include `created` and `variantCount` in API route output

**Files:**
- Modify: `app/api/models/route.ts`

- [ ] **Step 1: Rewrite the route to compute `variantCount` and keep `created`**

Replace `app/api/models/route.ts` with:

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/models/route.ts
git commit -m "feat: include created and variantCount fields in models API response"
```

---

## Task 3: Regenerate the model catalog JSON

**Files:**
- Modify: `lib/generated/openrouterModels.json`

- [ ] **Step 1: Run the catalog update script**

```bash
OPENROUTER_API_KEY=$(grep OPENROUTER_API_KEY .env.local | cut -d= -f2) npm run models:update
```

If `OPENROUTER_API_KEY` is not in `.env.local`, check `.env` or run:

```bash
npm run models:update
```

The script calls `GET /api/models` internally; the dev server must be running (`npm run dev -- --port 3001`).

- [ ] **Step 2: Verify the JSON now has `created` and `variantCount`**

```bash
node -e "const d = require('./lib/generated/openrouterModels.json'); const m = d.models[0]; console.log(JSON.stringify(m, null, 2));"
```

Expected output includes `created` (a number > 0) and `variantCount` (a number ≥ 1).

- [ ] **Step 3: Commit**

```bash
git add lib/generated/openrouterModels.json
git commit -m "chore: regenerate model catalog with created and variantCount fields"
```

---

## Task 4: Create `ModelPicker` component with search, filter, and badges

**Files:**
- Create: `app/chat/ModelPicker.tsx`

- [ ] **Step 1: Create the file**

```typescript
// app/chat/ModelPicker.tsx
"use client";

import { useState, useMemo } from "react";
import { CatalogModel, isNew, isPopular, providerFromId, providerLabel } from "@/lib/modelCatalog";

function ModelBadges({ model }: { model: CatalogModel }) {
  const popular = isPopular(model);
  const newModel = isNew(model);
  if (!popular && !newModel) return null;
  return (
    <span className="ml-1 inline-flex gap-1">
      {newModel && (
        <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-medium text-teal-700">
          New
        </span>
      )}
      {popular && (
        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
          Popular
        </span>
      )}
    </span>
  );
}

export function ModelPicker(props: {
  selected: string;
  onSelect: (model: string) => void;
  featuredModels: CatalogModel[];
  moreModels: CatalogModel[];
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");

  const allModels = useMemo(
    () => [...props.featuredModels, ...props.moreModels],
    [props.featuredModels, props.moreModels]
  );

  const filteredModels = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allModels.filter((model) => {
      if (providerFilter !== "all" && providerFromId(model.id) !== providerFilter) return false;
      if (q && !model.label.toLowerCase().includes(q) && !model.id.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allModels, search, providerFilter]);

  const providers = useMemo(() => {
    const seen = new Set<string>();
    for (const model of filteredModels) {
      seen.add(providerFromId(model.id));
    }
    // Reset provider filter if no matches remain
    return Array.from(seen).sort();
  }, [filteredModels]);

  // Ensure providerFilter stays valid when search narrows results
  const effectiveProvider = providers.includes(providerFilter) ? providerFilter : "all";

  const displayModels = useMemo(() => {
    if (effectiveProvider === providerFilter) return filteredModels;
    return filteredModels;
  }, [filteredModels, effectiveProvider, providerFilter]);

  return (
    <div className="space-y-2">
      {/* Featured pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {props.featuredModels.map((model) => {
          const active = props.selected === model.id;
          return (
            <button
              key={model.id}
              className={`flex shrink-0 items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs ${
                active
                  ? "border-primary bg-primary text-white"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
              disabled={props.disabled}
              onClick={() => props.onSelect(model.id)}
              type="button"
            >
              {model.label}
              {!active && <ModelBadges model={model} />}
              <span className="ml-1 opacity-60">{model.price}</span>
            </button>
          );
        })}
      </div>

      {/* Toggle button */}
      <button
        className="text-xs font-medium text-primary"
        disabled={props.disabled}
        onClick={() => setExpanded((v) => !v)}
        type="button"
      >
        {expanded ? "Hide more models" : "Show more models"}
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
          {/* Search */}
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Search models…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* Provider filter chips */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setProviderFilter("all")}
              className={`rounded-full border px-2.5 py-0.5 text-xs ${
                effectiveProvider === "all"
                  ? "border-primary bg-primary text-white"
                  : "border-slate-300 bg-white text-slate-600"
              }`}
            >
              All
            </button>
            {providers.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setProviderFilter(p === effectiveProvider ? "all" : p)}
                className={`rounded-full border px-2.5 py-0.5 text-xs ${
                  effectiveProvider === p
                    ? "border-primary bg-primary text-white"
                    : "border-slate-300 bg-white text-slate-600"
                }`}
              >
                {providerLabel(p)}
              </button>
            ))}
          </div>

          {/* Model list */}
          <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white">
            {displayModels.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-slate-400">No models match your search.</p>
            )}
            {displayModels.map((model) => {
              const active = props.selected === model.id;
              return (
                <button
                  key={model.id}
                  type="button"
                  disabled={props.disabled}
                  onClick={() => props.onSelect(model.id)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-slate-50 ${
                    active ? "bg-blue-50 font-medium text-primary" : "text-slate-700"
                  }`}
                >
                  <span className="flex items-center gap-1 min-w-0">
                    <span className="truncate">{model.label}</span>
                    <ModelBadges model={model} />
                  </span>
                  <span className="ml-2 shrink-0 text-slate-400">{model.price}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom model ID input */}
      <input
        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
        onChange={(event) => props.onSelect(event.target.value)}
        placeholder="Custom model ID"
        value={props.selected}
      />
      <p className="text-xs text-slate-500">Price tag: $ cheap, $$ normal, $$$ expensive.</p>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add app/chat/ModelPicker.tsx
git commit -m "feat: add ModelPicker component with search, provider filter, and New/Popular badges"
```

---

## Task 5: Wire `ModelPicker` into `page.tsx` and add badges to quick-start pills

**Files:**
- Modify: `app/chat/page.tsx`

**Context:** `page.tsx` currently has an inline `ModelPicker` function definition at line ~283 and a separate quick-start model pill row at line ~1740 that also renders featured models without badges. Both need updating.

- [ ] **Step 1: Replace the inline `ModelPicker` import/definition**

At the top of `app/chat/page.tsx`, add this import (after the existing imports):

```typescript
import { ModelPicker } from "@/app/chat/ModelPicker";
```

Then delete the entire inline `ModelPicker` function definition (lines ~283–347, the block starting with `function ModelPicker(props: {` through its closing `}`).

- [ ] **Step 2: Add badge imports**

Add `isNew`, `isPopular` to the existing `@/lib/modelCatalog` import line in `page.tsx`:

```typescript
import {
  CatalogModel,
  FEATURED_MODELS,
  MORE_MODELS,
  modelPriceTag,
  isNew,
  isPopular
} from "@/lib/modelCatalog";
```

- [ ] **Step 3: Add badges to the quick-start model pills**

Find the quick-start model pill renderer (around line ~1740, inside the Quick Start `SetupSection`). It currently renders:

```tsx
{model.label} {model.price}
```

Replace that button's contents with:

```tsx
<span className="flex items-center gap-1">
  {model.label}
  {isNew(model) && (
    <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-medium text-teal-700">
      New
    </span>
  )}
  {isPopular(model) && (
    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
      Popular
    </span>
  )}
  <span className="opacity-60">{model.price}</span>
</span>
```

- [ ] **Step 4: Verify the app compiles and runs**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Open http://localhost:3001 and verify:
- Featured model pills show in agent setup with New/Popular badges
- "Show more models" opens the search + filter panel
- Typing in search filters the list
- Clicking a company filter narrows the list
- Selecting a model from the list highlights it and sets the agent's model
- Quick-start model pills also show badges

- [ ] **Step 5: Commit**

```bash
git add app/chat/page.tsx
git commit -m "feat: wire ModelPicker component into chat page with badges on quick-start pills"
```

---

## Task 6: Push branch

- [ ] **Step 1: Push to remote**

```bash
git push -u origin feature/model-picker-enhancement
```
