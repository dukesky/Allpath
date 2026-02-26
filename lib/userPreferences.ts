export const USER_PREFERENCES_STORAGE_KEY = "allpath-user-preferences";

export interface PromptPreset {
  id: string;
  name: string;
  prompt: string;
}

export interface UserPreferences {
  globalApiKey: string;
  promptPresets: PromptPreset[];
  defaultPromptPresetId: string;
}

export const DEFAULT_SESSION_RULES = [
  "You only speak for yourself; never write what other agents would say.",
  "Treat other agents as peers and the user as the discussion owner.",
  "Do not imitate formatting of prior messages.",
  "Do not output prefixes like 'Speaker:' or 'Message:'.",
  "Do not output bracket tags like '[Name | model]'.",
  "If you want to reference another agent, summarize their idea in one short sentence.",
  "If disagreeing, explain your own reasoning only."
].join("\n");

export const CUSTOM_PROMPT_PRESET_ID = "__custom__";

export function defaultUserPreferences(): UserPreferences {
  const defaultPreset: PromptPreset = {
    id: "preset-default-rules",
    name: "Default Session Rules",
    prompt: DEFAULT_SESSION_RULES
  };
  const historicalRoundtablePreset: PromptPreset = {
    id: "preset-historical-roundtable",
    name: "Historical Figures Roundtable",
    prompt: [
      "You are part of a historical figures roundtable.",
      "Each agent represents a distinct historical persona and must only speak in their own voice.",
      "Debate with evidence, period context, and clear assumptions.",
      "When disagreeing, challenge ideas directly but stay respectful.",
      "Avoid modern slang and avoid speaking for other participants.",
      "End with one practical takeaway for the user."
    ].join("\n")
  };

  return {
    globalApiKey: "",
    promptPresets: [defaultPreset, historicalRoundtablePreset],
    defaultPromptPresetId: defaultPreset.id
  };
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function normalizeUserPreferences(raw: unknown): UserPreferences {
  const fallback = defaultUserPreferences();
  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const value = raw as Record<string, unknown>;
  const presetsRaw = Array.isArray(value.promptPresets) ? value.promptPresets : [];
  const normalizedPresets: PromptPreset[] = presetsRaw
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const item = entry as Record<string, unknown>;
      const name = typeof item.name === "string" ? item.name.trim() : "";
      const prompt = typeof item.prompt === "string" ? item.prompt.trim() : "";
      if (!name || !prompt) {
        return null;
      }
      const id = typeof item.id === "string" && item.id.trim() ? item.id : `preset-${uid()}`;
      return { id, name, prompt };
    })
    .filter((item): item is PromptPreset => !!item);

  const mergedPresets = [
    ...normalizedPresets,
    ...fallback.promptPresets.filter(
      (preset) => !normalizedPresets.some((item) => item.name.toLowerCase() === preset.name.toLowerCase())
    )
  ];

  const defaultPresetId =
    typeof value.defaultPromptPresetId === "string" &&
    mergedPresets.some((preset) => preset.id === value.defaultPromptPresetId)
      ? value.defaultPromptPresetId
      : mergedPresets[0].id;

  return {
    globalApiKey: typeof value.globalApiKey === "string" ? value.globalApiKey : "",
    promptPresets: mergedPresets,
    defaultPromptPresetId: defaultPresetId
  };
}
