export type PriceTier = "$" | "$$" | "$$$";

export interface CatalogModel {
  id: string;
  label: string;
  price: PriceTier;
}

export const FEATURED_MODELS: CatalogModel[] = [
  { id: "openai/gpt-5-mini", label: "OpenAI GPT-5 mini", price: "$" },
  { id: "openai/gpt-5-chat", label: "OpenAI GPT-5 Chat", price: "$$" },
  { id: "anthropic/claude-sonnet-4.5", label: "Anthropic Claude Sonnet 4.5", price: "$$" },
  { id: "anthropic/claude-opus-4.1", label: "Anthropic Claude Opus 4.1", price: "$$$" },
  { id: "google/gemini-2.5-flash", label: "Google Gemini 2.5 Flash", price: "$" },
  { id: "minimax/minimax-m1", label: "MiniMax M1", price: "$" },
  { id: "z-ai/glm-4.5", label: "GLM 4.5", price: "$" },
  { id: "qwen/qwen3-235b-a22b", label: "Qwen3 235B A22B", price: "$" }
];

export const MORE_MODELS: CatalogModel[] = [
  { id: "openai/gpt-5", label: "OpenAI GPT-5", price: "$$$" },
  { id: "openai/gpt-5-nano", label: "OpenAI GPT-5 nano", price: "$" },
  { id: "openai/gpt-5.1", label: "OpenAI GPT-5.1", price: "$$$" },
  { id: "openai/o3-pro", label: "OpenAI o3-pro", price: "$$$" },
  { id: "anthropic/claude-opus-4", label: "Anthropic Claude Opus 4", price: "$$$" },
  { id: "anthropic/claude-sonnet-4", label: "Anthropic Claude Sonnet 4", price: "$$" },
  { id: "google/gemini-2.5-pro", label: "Google Gemini 2.5 Pro", price: "$$" },
  { id: "minimax/minimax-m2", label: "MiniMax M2", price: "$$" },
  { id: "z-ai/glm-4.5v", label: "GLM 4.5V", price: "$$" },
  { id: "qwen/qwen3-30b-a3b", label: "Qwen3 30B A3B", price: "$" },
  { id: "qwen/qwen3-coder", label: "Qwen3 Coder", price: "$$" },
  { id: "qwen/qwen3-next-80b-a3b-thinking", label: "Qwen3 Next 80B Thinking", price: "$$" }
];

export function modelPriceTag(modelId: string): PriceTier | "?" {
  const found = [...FEATURED_MODELS, ...MORE_MODELS].find((model) => model.id === modelId);
  return found?.price ?? "?";
}
