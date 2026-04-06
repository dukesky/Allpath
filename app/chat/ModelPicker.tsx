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
    for (const model of allModels) {
      seen.add(providerFromId(model.id));
    }
    return Array.from(seen).sort();
  }, [allModels]);

  // If providerFilter no longer matches any results (e.g. search narrowed it out), fall back to "all"
  const effectiveProvider = providers.includes(providerFilter) ? providerFilter : "all";

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
            aria-label="Search models"
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
            {filteredModels.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-slate-400">No models match your search.</p>
            )}
            {filteredModels.map((model) => {
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
                  <span className="flex min-w-0 items-center gap-1">
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
        aria-label="Custom model ID"
        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
        onChange={(event) => props.onSelect(event.target.value)}
        placeholder="Custom model ID"
        value={props.selected}
      />
      <p className="text-xs text-slate-500">Price tag: $ cheap, $$ normal, $$$ expensive.</p>
    </div>
  );
}
