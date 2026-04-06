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
