import { ModelMessage, ProviderAdapter, ProviderConfig } from "@/lib/types";

function parseSseChunk(buffer: string): { rest: string; deltas: string[] } {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  const deltas: string[] = [];

  for (const part of parts) {
    const line = part
      .split("\n")
      .find((entry) => entry.startsWith("data:"));

    if (!line) {
      continue;
    }

    const raw = line.slice(5).trim();
    if (!raw || raw === "[DONE]") {
      continue;
    }

    try {
      const json = JSON.parse(raw) as {
        choices?: Array<{ delta?: { content?: string } }>;
      };
      const token = json.choices?.[0]?.delta?.content;
      if (token) {
        deltas.push(token);
      }
    } catch {
      // Keep stream robust against malformed chunks.
    }
  }

  return { rest, deltas };
}

async function* streamFromOpenAICompatible(input: {
  endpoint: string;
  apiKey: string;
  model: string;
  messages: ModelMessage[];
  extraHeaders?: Record<string, string>;
}): AsyncGenerator<string> {
  const response = await fetch(input.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.apiKey}`,
      ...(input.extraHeaders ?? {})
    },
    body: JSON.stringify({
      model: input.model,
      messages: input.messages,
      stream: true
    })
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "");
    throw new Error(`Provider request failed: ${response.status} ${text}`.trim());
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const { rest, deltas } = parseSseChunk(buffer);
    buffer = rest;

    for (const delta of deltas) {
      yield delta;
    }
  }
}

const openRouterAdapter: ProviderAdapter = {
  async *streamChat({ model, messages, provider }) {
    if (!provider.apiKey) {
      throw new Error("Missing OpenRouter API key.");
    }

    yield* streamFromOpenAICompatible({
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: provider.apiKey,
      model,
      messages,
      extraHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_APP_NAME ?? "AllPath MVP"
      }
    });
  },

  async listModels(provider: ProviderConfig) {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${provider.apiKey || process.env.OPENROUTER_API_KEY || ""}`
      }
    });

    if (!response.ok) {
      throw new Error(`OpenRouter models request failed: ${response.status}`);
    }

    const json = (await response.json()) as { data?: Array<{ id: string; name?: string }> };
    return (json.data ?? []).map((entry) => ({ id: entry.id, name: entry.name ?? entry.id }));
  }
};

const customAdapter: ProviderAdapter = {
  async *streamChat({ model, messages, provider }) {
    if (!provider.apiKey) {
      throw new Error("Missing custom provider API key.");
    }

    if (!provider.baseUrl) {
      throw new Error("Missing custom provider baseUrl.");
    }

    const endpoint = `${provider.baseUrl.replace(/\/$/, "")}/chat/completions`;
    yield* streamFromOpenAICompatible({
      endpoint,
      apiKey: provider.apiKey,
      model,
      messages
    });
  }
};

export function getAdapter(provider: ProviderConfig): ProviderAdapter {
  if (provider.type === "openrouter") {
    return openRouterAdapter;
  }

  return customAdapter;
}
