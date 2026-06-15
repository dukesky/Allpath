"use client";

import { Mode } from "@/lib/types";

interface ModeSwitcherProps {
  sessionMode: Mode;
  onChangeMode: (mode: Mode) => void;
  disabled?: boolean;
}

const MODE_LABELS: Record<Mode, string> = {
  roundtable: "圆桌",
  one_to_one: "一对一",
};

const MODE_DESCRIPTIONS: Record<Mode, string> = {
  roundtable: "圆桌：所有角色互相看见彼此的回复",
  one_to_one: "一对一：每个角色只看你的消息，不看其他角色的回复",
};

export function ModeSwitcher({ sessionMode, onChangeMode, disabled }: ModeSwitcherProps) {
  return (
    <div className="mb-3">
      <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-slate-100 p-0.5">
        {(["roundtable", "one_to_one"] as Mode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            disabled={disabled}
            onClick={() => onChangeMode(mode)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              sessionMode === mode
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            } disabled:opacity-40`}
          >
            {MODE_LABELS[mode]}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-center text-[11px] text-slate-500">
        {MODE_DESCRIPTIONS[sessionMode]}
      </p>
    </div>
  );
}
