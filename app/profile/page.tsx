"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  CUSTOM_PROMPT_PRESET_ID,
  defaultUserPreferences,
  normalizeUserPreferences,
  PromptPreset,
  USER_PREFERENCES_STORAGE_KEY
} from "@/lib/userPreferences";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function parseLocalJson<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export default function ProfilePage() {
  const [apiKey, setApiKey] = useState("");
  const [presets, setPresets] = useState<PromptPreset[]>([]);
  const [defaultPresetId, setDefaultPresetId] = useState("");
  const [newPresetName, setNewPresetName] = useState("");
  const [newPresetPrompt, setNewPresetPrompt] = useState("");

  useEffect(() => {
    const normalized = normalizeUserPreferences(
      parseLocalJson(localStorage.getItem(USER_PREFERENCES_STORAGE_KEY), defaultUserPreferences())
    );
    setApiKey(normalized.globalApiKey);
    setPresets(normalized.promptPresets);
    setDefaultPresetId(normalized.defaultPromptPresetId);
  }, []);

  useEffect(() => {
    if (!defaultPresetId && presets[0]) {
      setDefaultPresetId(presets[0].id);
    }
  }, [defaultPresetId, presets]);

  function save() {
    const normalized = normalizeUserPreferences({
      globalApiKey: apiKey,
      promptPresets: presets,
      defaultPromptPresetId: defaultPresetId
    });
    localStorage.setItem(USER_PREFERENCES_STORAGE_KEY, JSON.stringify(normalized));
  }

  function addPreset(event: FormEvent) {
    event.preventDefault();
    const name = newPresetName.trim();
    const prompt = newPresetPrompt.trim();
    if (!name || !prompt) {
      return;
    }

    const preset = { id: `preset-${uid()}`, name, prompt };
    setPresets((current) => [...current, preset]);
    setNewPresetName("");
    setNewPresetPrompt("");
  }

  function removePreset(id: string) {
    setPresets((current) => {
      const next = current.filter((item) => item.id !== id);
      if (defaultPresetId === id) {
        setDefaultPresetId(next[0]?.id ?? CUSTOM_PROMPT_PRESET_ID);
      }
      return next;
    });
  }

  function updatePreset(id: string, patch: Partial<PromptPreset>) {
    setPresets((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl p-4">
      <header className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-semibold">User Profile</h1>
        <p className="mt-1 text-sm text-slate-600">
          Save reusable preferences for chat setup: API key and session-rule presets.
        </p>
        <div className="mt-2 flex gap-3">
          <Link className="text-sm font-medium text-primary" href="/">
            Back to Chat
          </Link>
          <Link className="text-sm font-medium text-primary" href="/agents">
            Open Agent Personality Studio
          </Link>
        </div>
      </header>

      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold">Default OpenRouter API Key</p>
        <p className="mt-1 text-xs text-slate-500">
          This key is the default for OpenRouter calls in the main page when you choose "Use Default API Key".
          Get or manage your key at{" "}
          <a
            className="font-medium text-primary"
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noreferrer"
          >
            OpenRouter Keys
          </a>
          .
        </p>
        <input
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="Used as default in main page"
        />
      </section>

      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold">Prompt Presets</p>
        <p className="mt-1 text-xs text-slate-500">
          Prompt presets define session-level agent behavior (discussion style, tone, and rules). Main page can choose one preset or Custom.
        </p>

        <form className="mt-3 space-y-2" onSubmit={addPreset}>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={newPresetName}
            onChange={(event) => setNewPresetName(event.target.value)}
            placeholder="Preset name"
          />
          <textarea
            className="h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={newPresetPrompt}
            onChange={(event) => setNewPresetPrompt(event.target.value)}
            placeholder="Prompt content"
          />
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white" type="submit">
            Add Preset
          </button>
        </form>

        <div className="mt-4 space-y-3">
          {presets.map((preset) => (
            <article key={preset.id} className="rounded-xl border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="radio"
                    checked={defaultPresetId === preset.id}
                    onChange={() => setDefaultPresetId(preset.id)}
                  />
                  Default
                </label>
                <button
                  className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-700"
                  type="button"
                  onClick={() => removePreset(preset.id)}
                >
                  Delete
                </button>
              </div>
              <input
                className="mb-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={preset.name}
                onChange={(event) => updatePreset(preset.id, { name: event.target.value })}
              />
              <textarea
                className="h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={preset.prompt}
                onChange={(event) => updatePreset(preset.id, { prompt: event.target.value })}
              />
            </article>
          ))}
        </div>
      </section>

      <button
        className="rounded-md bg-ink px-5 py-2 text-sm font-medium text-white"
        onClick={save}
        type="button"
      >
        Save User Preferences
      </button>
    </main>
  );
}
