# Model Picker Enhancement: Search, Filter, and Badges

**Date:** 2026-04-05
**Status:** Approved

---

## Overview

Improve the model selection experience with three connected changes: enrich the catalog with `created` and `variantCount` data, add New/Popular badges derived from that data, and replace the plain `<select>` dropdown in "Show more models" with a searchable, filterable panel.

---

## Part 1: Catalog Data Enrichment

### `CatalogModel` type (updated)

```ts
export interface CatalogModel {
  id: string;
  label: string;
  price: PriceTier;
  created?: number;      // Unix timestamp from OpenRouter API
  variantCount?: number; // Count of variants sharing the same base model ID
}
```

### `app/api/models/route.ts` changes

Currently `created` is computed but stripped before returning. Changes:
- Keep `created` in the output
- Compute `variantCount`: group all model IDs by their base (strip `:free`, `:extended`, `:thinking`, `:online`, `:nitro` suffixes), count how many share the same base, assign that count to each model

### `lib/generated/openrouterModels.json`

Updated by the existing daily GitHub Actions workflow. Will now contain `created` and `variantCount` alongside `id`, `label`, `price`.

---

## Part 2: Badge Logic

### `lib/modelCatalog.ts` additions

**Curated popular model IDs (`POPULAR_MODEL_IDS`):**
A `Set<string>` of ~20 well-known model IDs:
- `openai/gpt-4o`, `openai/gpt-4o-mini`, `openai/o3-mini`, `openai/o1`
- `anthropic/claude-3.5-sonnet`, `anthropic/claude-3.5-haiku`, `anthropic/claude-3-opus`
- `google/gemini-2.0-flash`, `google/gemini-2.5-flash`, `google/gemini-2.5-pro`
- `meta-llama/llama-3.3-70b-instruct`, `meta-llama/llama-3.1-8b-instruct`
- `deepseek/deepseek-r1`, `deepseek/deepseek-chat`
- `mistralai/mistral-large`, `mistralai/mistral-nemo`
- `qwen/qwen-2.5-72b-instruct`
- `x-ai/grok-2-1212`

**Helper functions:**

```ts
const NEW_WINDOW_DAYS = 60;

export function isNew(model: CatalogModel): boolean {
  if (!model.created) return false;
  const cutoff = Date.now() / 1000 - NEW_WINDOW_DAYS * 86400;
  return model.created >= cutoff;
}

export function isPopular(model: CatalogModel): boolean {
  return POPULAR_MODEL_IDS.has(model.id) || (model.variantCount ?? 0) >= 3;
}

export function providerFromId(modelId: string): string {
  return modelId.split("/")[0] ?? modelId;
}

export function providerLabel(provider: string): string {
  const labels: Record<string, string> = {
    openai: "OpenAI", anthropic: "Anthropic", google: "Google",
    "meta-llama": "Meta", deepseek: "DeepSeek", mistralai: "Mistral",
    qwen: "Qwen", "x-ai": "xAI", cohere: "Cohere", "01-ai": "01.AI",
    "microsoft": "Microsoft", "nvidia": "NVIDIA"
  };
  return labels[provider] ?? provider;
}
```

---

## Part 3: Updated `FEATURED_MODELS`

Curated to popular/mainstream models only — nothing older than ~6 months unless a standout. Target 8–10 pills. Each uses the existing `POPULAR_MODEL_IDS` and `isNew()` to show badges.

Updated list (approximate — final IDs confirmed against live catalog):
- openai/gpt-4o-mini (Popular)
- openai/gpt-4o (Popular)
- anthropic/claude-3.5-haiku (Popular)
- anthropic/claude-3.5-sonnet (Popular)
- google/gemini-2.5-flash (New + Popular)
- google/gemini-2.0-flash (Popular)
- deepseek/deepseek-r1 (Popular)
- meta-llama/llama-3.3-70b-instruct (Popular)

---

## Part 4: Enhanced ModelPicker Component

Extracted to `app/chat/ModelPicker.tsx` (currently inline in `app/chat/page.tsx`). Props interface unchanged — consumers pass `selected`, `onSelect`, `featuredModels`, `moreModels`, `disabled`.

### Internal state

```ts
const [expanded, setExpanded] = useState(false);
const [search, setSearch] = useState("");
const [providerFilter, setProviderFilter] = useState("all");
```

### Layout when expanded

```
[ 🔍 Search models...              ]
[ All | OpenAI | Anthropic | Google | Meta | DeepSeek | ... ]
──────────────────────────────────────────────────
  GPT-4o mini        🔥 Popular  $
  Claude 3.5 Haiku   🔥 Popular  $
  Gemini 2.5 Flash   ✨ New  🔥  $
  ...
──────────────────────────────────────────────────
[ Custom model ID input ]
```

- **Search**: filters combined list (`featuredModels + moreModels`) by `label` or `id` (case-insensitive)
- **Provider chips**: derived dynamically from the filtered list; only show providers with ≥1 result
- **Model list**: scrollable div (max-h ~320px), each row shows label + badges + price tag
- **Badges**: `✨ New` (teal) and `🔥 Popular` (amber), shown inline after label
- **Selected model**: highlighted with primary color border
- **Custom model ID input**: remains below the expanded panel, unchanged

### Featured pills (unchanged layout, badges added)

Each pill appends badge indicators inline:
```
[ GPT-4o mini 🔥 $ ]  [ Gemini 2.5 Flash ✨🔥 $ ]
```

---

## Files Changed

| File | Change |
|------|--------|
| `lib/modelCatalog.ts` | Add `created?`, `variantCount?` to `CatalogModel`; add `POPULAR_MODEL_IDS`, `isNew()`, `isPopular()`, `providerFromId()`, `providerLabel()`; update `FEATURED_MODELS` |
| `app/api/models/route.ts` | Keep `created` in output; compute and include `variantCount` |
| `lib/generated/openrouterModels.json` | Auto-updated by workflow (now includes `created`, `variantCount`) |
| `app/chat/ModelPicker.tsx` | New file — extracted + enhanced component with search, filter, badges |
| `app/chat/page.tsx` | Import `ModelPicker` from new file; remove inline definition |

---

## Out of Scope

- Popularity based on live usage metrics (no real-time API for this)
- Price filtering
- Model comparison
- Saving favorite models per user
