export type PriceTier = "$" | "$$" | "$$$";

export interface CatalogModel {
  id: string;
  label: string;
  price: PriceTier;
}

export const FEATURED_MODELS: CatalogModel[] = [
  { id: "openai/gpt-4o-mini", label: "GPT-4o mini", price: "$" },
  { id: "openai/gpt-4.1-mini", label: "GPT-4.1 mini", price: "$" },
  { id: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku", price: "$" },
  { id: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5", price: "$$$" },
  { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash", price: "$" },
  { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B", price: "$$" }
];

export const MORE_MODELS: CatalogModel[] = [
  { id: "openai/gpt-4.1", label: "GPT-4.1", price: "$$$" },
  { id: "openai/gpt-4o", label: "GPT-4o", price: "$$" },
  { id: "openai/o3-mini", label: "o3-mini", price: "$$" },
  { id: "anthropic/claude-3.7-sonnet", label: "Claude 3.7 Sonnet", price: "$$$" },
  { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet", price: "$$" },
  { id: "google/gemini-1.5-pro", label: "Gemini 1.5 Pro", price: "$$" },
  { id: "google/gemini-1.5-flash", label: "Gemini 1.5 Flash", price: "$" },
  { id: "mistralai/mistral-large", label: "Mistral Large", price: "$$" },
  { id: "deepseek/deepseek-chat", label: "DeepSeek Chat", price: "$" },
  { id: "qwen/qwen-2.5-72b-instruct", label: "Qwen 2.5 72B", price: "$" }
];

export function modelPriceTag(modelId: string): PriceTier | "?" {
  const found = [...FEATURED_MODELS, ...MORE_MODELS].find((model) => model.id === modelId);
  return found?.price ?? "?";
}
