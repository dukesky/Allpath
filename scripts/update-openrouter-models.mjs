#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUTPUT_FILE = path.join(ROOT, "lib/generated/openrouterModels.json");

const MIN_CREATED_UNIX = Math.floor(new Date("2025-03-01T00:00:00Z").getTime() / 1000);
const MAX_MODELS = 500;

function toPriceTier(prompt, completion) {
  const avg = (prompt + completion) / 2;
  if (avg <= 0.0000015) return "$";
  if (avg <= 0.00001) return "$$";
  return "$$$";
}

function baseModelId(id) {
  return id.split(":")[0] ?? id;
}

function normalizeModel(model, variantCounts) {
  const prompt = Number(model.pricing?.prompt ?? "0");
  const completion = Number(model.pricing?.completion ?? "0");
  return {
    id: model.id,
    label: (model.name ?? "").trim() || model.id,
    price: toPriceTier(prompt, completion),
    created: model.created ?? 0,
    variantCount: variantCounts.get(baseModelId(model.id)) ?? 1
  };
}

async function fetchOpenRouterModels() {
  const apiKey = process.env.OPENROUTER_API_KEY ?? "";
  const response = await fetch("https://openrouter.ai/api/v1/models", {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`OpenRouter models request failed: ${response.status}`);
  }

  const json = await response.json();
  const raw = (json.data ?? [])
    .filter((model) => !!model?.id)
    .filter((model) => !model.created || model.created >= MIN_CREATED_UNIX);

  // Count how many models share each base ID (proxy for popularity/adoption).
  const variantCounts = new Map();
  for (const model of raw) {
    const base = baseModelId(model.id);
    variantCounts.set(base, (variantCounts.get(base) ?? 0) + 1);
  }

  const models = raw
    .map((model) => normalizeModel(model, variantCounts))
    .sort((a, b) => {
      if (b.created !== a.created) return b.created - a.created;
      return a.id.localeCompare(b.id);
    })
    .slice(0, MAX_MODELS);

  return models;
}

async function readCurrent() {
  try {
    const content = await readFile(OUTPUT_FILE, "utf8");
    return JSON.parse(content);
  } catch {
    return { models: [] };
  }
}

async function main() {
  const models = await fetchOpenRouterModels();
  const next = {
    source: "openrouter",
    generatedAt: new Date().toISOString(),
    minCreatedAt: "2025-03-01T00:00:00Z",
    models
  };

  await mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  const previous = await readCurrent();

  const previousModels = JSON.stringify(previous.models ?? []);
  const nextModels = JSON.stringify(next.models);
  if (previousModels === nextModels) {
    console.log("No model changes detected.");
    return;
  }

  await writeFile(OUTPUT_FILE, JSON.stringify(next, null, 2) + "\n", "utf8");
  console.log(`Updated ${OUTPUT_FILE} with ${models.length} models.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
