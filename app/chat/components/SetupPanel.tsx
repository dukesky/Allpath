"use client";

import { FormEvent } from "react";
import Link from "next/link";
import { CatalogModel, isNew, isPopular } from "@/lib/modelCatalog";
import { ModelPicker } from "@/app/chat/ModelPicker";
import { ProviderType } from "@/lib/types";
import { AgentProfile } from "@/lib/agentProfiles";
import {
  CUSTOM_PROMPT_PRESET_ID,
  PromptPreset,
} from "@/lib/userPreferences";
import { getDefaultAvatarUrl } from "@/lib/avatar";
import {
  ApiKeyMode,
  ParticipantForm,
  TrialStatusResponse,
} from "./types";
import {
  avatarLabel,
  remainingTrialPercent,
  storyExperience,
} from "./utils";

interface SetupPanelProps {
  // Trial
  trialStatus: TrialStatusResponse | null;
  inviteCode: string;
  isRedeemingInvite: boolean;
  onInviteCodeChange: (code: string) => void;
  onRedeemInvite: (event: FormEvent) => void;
  // Wizard state
  setupStep: 1 | 2 | 3;
  selectedStory: string;
  isAdvancedOpen: boolean;
  onSetupStepChange: (step: 1 | 2 | 3) => void;
  onSelectedStoryChange: (story: string) => void;
  onAdvancedToggle: () => void;
  // Stories & model
  quickStartStories: Array<{ story: string; members: AgentProfile[] }>;
  quickStartModel: string;
  modelPickerCatalog: { featuredModels: CatalogModel[]; moreModels: CatalogModel[] };
  onQuickStartModelChange: (model: string) => void;
  onQuickStartStory: (story: string) => void;
  // Advanced: session rules
  apiKeyMode: ApiKeyMode;
  defaultProfileApiKey: string;
  unifiedApiKey: string;
  promptPresets: PromptPreset[];
  selectedPromptPresetId: string;
  customInitialPrompt: string;
  hasServerOpenRouterAccess: boolean;
  onApiKeyModeChange: (mode: ApiKeyMode) => void;
  onUnifiedApiKeyChange: (key: string) => void;
  onPromptPresetChange: (id: string) => void;
  onCustomInitialPromptChange: (prompt: string) => void;
  // Advanced: participants
  participants: ParticipantForm[];
  profiles: AgentProfile[];
  stories: string[];
  onUpdateParticipant: (index: number, patch: Partial<ParticipantForm>) => void;
  onApplyProfileToParticipant: (index: number, profileId: string) => void;
  onAddParticipant: () => void;
  // Advanced: summarizer
  summarizerEnabled: boolean;
  summarizer: ParticipantForm;
  onSummarizerEnabledChange: (enabled: boolean) => void;
  onSummarizerChange: (updater: (current: ParticipantForm) => ParticipantForm) => void;
  onApplyProfileToSummarizer: (profileId: string) => void;
  // Advanced: submit
  canCreate: boolean;
  onCreateSession: (event: FormEvent) => void;
}

function filterProfilesByStory(profiles: AgentProfile[], storyFilter: string): AgentProfile[] {
  if (storyFilter === "all") {
    return profiles;
  }
  if (storyFilter === "__none__") {
    return profiles.filter((profile) => !profile.story.trim());
  }
  return profiles.filter((profile) => profile.story === storyFilter);
}

export function SetupPanel(props: SetupPanelProps) {
  const {
    trialStatus,
    inviteCode,
    isRedeemingInvite,
    onInviteCodeChange,
    onRedeemInvite,
    setupStep,
    selectedStory,
    isAdvancedOpen,
    quickStartStories,
    quickStartModel,
    modelPickerCatalog,
    promptPresets,
    selectedPromptPresetId,
    customInitialPrompt,
    apiKeyMode,
    defaultProfileApiKey,
    unifiedApiKey,
    hasServerOpenRouterAccess,
    participants,
    profiles,
    stories,
    summarizerEnabled,
    summarizer,
    canCreate,
  } = props;

  const selectedStoryMembers =
    quickStartStories.find((s) => s.story === selectedStory)?.members ?? [];

  const selectedPromptPreset = promptPresets.find((p) => p.id === selectedPromptPresetId);

  return (
    <div className="flex h-full flex-col overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* 顶部链接 */}
      <div className="flex gap-3 text-sm">
        <Link href="/agents" className="font-medium text-primary">
          Agent Personality Studio
        </Link>
        <Link href="/profile" className="font-medium text-primary">
          User Profile
        </Link>
      </div>

      {/* Trial 状态块 */}
      <div className="mt-4 space-y-3">
        {trialStatus?.available === true && trialStatus.requiresInviteCode && (
          <form
            className="rounded-xl border border-amber-300 bg-amber-50 p-3"
            onSubmit={onRedeemInvite}
          >
            <p className="text-sm font-semibold text-amber-900">Friend Trial Access</p>
            <p className="mt-1 text-xs text-amber-800">
              Enter an invite code to unlock trial access. Active browsers cannot redeem again. Exhausted browsers can redeem a new code to refresh access.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                className="flex-1 rounded-md border border-amber-300 px-3 py-2 text-sm"
                value={inviteCode}
                onChange={(event) => onInviteCodeChange(event.target.value)}
                placeholder="Invite code"
              />
              <button
                type="submit"
                disabled={isRedeemingInvite}
                className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {isRedeemingInvite ? "Checking..." : "Redeem"}
              </button>
            </div>
          </form>
        )}

        {trialStatus?.available === true && !trialStatus.requiresInviteCode && (
          <div
            className={`rounded-xl border p-3 text-sm ${
              trialStatus.trialStatus === "active"
                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                : "border-rose-300 bg-rose-50 text-rose-900"
            }`}
          >
            <p className="font-semibold">
              {trialStatus.hasPersonalOpenRouterKey
                ? "Personal OpenRouter key saved for this browser"
                : trialStatus.trialStatus === "active"
                  ? "Free trial is active"
                  : "Free trial budget is exhausted"}
            </p>
            <p className="mt-1 text-xs">
              Trial remaining: {remainingTrialPercent(trialStatus)}%
              {!trialStatus.hasPersonalOpenRouterKey && trialStatus.trialStatus !== "active"
                ? " . Add your own OpenRouter key in User Profile to continue."
                : ""}
            </p>
          </div>
        )}
      </div>

      {/* 步骤指示器 */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {([1, 2, 3] as const).map((step, idx) => (
          <div key={step} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                setupStep === step
                  ? "bg-primary text-white"
                  : setupStep > step
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-200 text-slate-500"
              }`}
            >
              {setupStep > step ? "✓" : step}
            </div>
            {idx < 2 && (
              <div
                className={`h-px w-8 ${setupStep > step ? "bg-emerald-400" : "bg-slate-200"}`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-around text-[10px] text-slate-500">
        <span>选角色组</span>
        <span>选模型</span>
        <span>开始</span>
      </div>

      {/* Step 1: 选故事 */}
      {setupStep === 1 && (
        <div className="mt-4 flex-1">
          <p className="mb-3 text-sm font-semibold text-slate-800">选一个剧本开始</p>
          <div className="space-y-2">
            {quickStartStories.map(({ story, members }) => (
              <button
                key={story}
                type="button"
                onClick={() => props.onSelectedStoryChange(story)}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                  selectedStory === story
                    ? "border-primary bg-blue-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex -space-x-2">
                  {members.slice(0, 3).map((m, i) => (
                    <div
                      key={m.id}
                      className="h-8 w-8 overflow-hidden rounded-full border-2 border-white"
                    >
                      <img
                        src={m.avatarUrl || getDefaultAvatarUrl(i)}
                        alt={m.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{story}</p>
                  <p className="text-[11px] text-slate-500">
                    {members.length} 个角色 · {storyExperience(story).tagline.slice(0, 30)}…
                  </p>
                </div>
                {selectedStory === story && <span className="text-primary">✓</span>}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!selectedStory}
            onClick={() => props.onSetupStepChange(2)}
            className="mt-4 w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            下一步 →
          </button>
        </div>
      )}

      {/* Step 2: 选模型 */}
      {setupStep === 2 && (
        <div className="mt-4 flex-1">
          <button
            type="button"
            onClick={() => props.onSetupStepChange(1)}
            className="mb-3 text-xs text-slate-500 hover:text-slate-700"
          >
            ← 返回
          </button>
          <p className="mb-3 text-sm font-semibold text-slate-800">选择模型（应用到所有角色）</p>
          <div className="flex flex-wrap gap-2">
            {modelPickerCatalog.featuredModels.map((model) => {
              const active = quickStartModel === model.id;
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => props.onQuickStartModelChange(model.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-all ${
                    active
                      ? "border-primary bg-primary text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                  }`}
                >
                  {model.label}{" "}
                  {isNew(model) && (
                    <span className="rounded-full bg-teal-100 px-1 text-[10px] font-medium text-teal-700">
                      New
                    </span>
                  )}
                  {isPopular(model) && (
                    <span className="text-[11px]" title="Popular">
                      🔥
                    </span>
                  )}
                  <span className="opacity-60">{model.price}</span>
                </button>
              );
            })}
          </div>

          {/* 高级设置折叠 */}
          <button
            type="button"
            onClick={props.onAdvancedToggle}
            className="mt-4 flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600"
          >
            <span>高级设置</span>
            <span>{isAdvancedOpen ? "▲" : "▼"}</span>
          </button>
          {isAdvancedOpen && (
            <div className="mt-2 space-y-3 rounded-xl border border-slate-200 p-3">
              {/* Session Rules */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-700">Agent 初始提示（Session Rules）</p>
                <select
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  value={selectedPromptPresetId}
                  onChange={(e) => props.onPromptPresetChange(e.target.value)}
                >
                  {promptPresets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                  <option value={CUSTOM_PROMPT_PRESET_ID}>自定义</option>
                </select>
                {selectedPromptPresetId === CUSTOM_PROMPT_PRESET_ID ? (
                  <textarea
                    className="h-24 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                    value={customInitialPrompt}
                    onChange={(e) => props.onCustomInitialPromptChange(e.target.value)}
                  />
                ) : (
                  <textarea
                    className="h-24 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-600"
                    value={selectedPromptPreset?.prompt ?? ""}
                    readOnly
                  />
                )}
              </div>
              {/* API Key Mode */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-700">OpenRouter API Key 模式</p>
                <select
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  value={apiKeyMode}
                  onChange={(e) => props.onApiKeyModeChange(e.target.value as ApiKeyMode)}
                >
                  <option value="default_profile">使用 User Profile 默认 Key</option>
                  <option value="unified">统一 Key（在此处输入一次）</option>
                  <option value="by_agent">每个 Agent 单独配置</option>
                </select>
                {apiKeyMode === "default_profile" && (
                  <div className="space-y-1">
                    <input
                      className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-600"
                      type="password"
                      value={defaultProfileApiKey}
                      readOnly
                      placeholder="User Profile 中无默认 Key"
                    />
                    {!defaultProfileApiKey.trim() && hasServerOpenRouterAccess && (
                      <p className="text-xs text-emerald-700">
                        Server-backed guest access is available.
                      </p>
                    )}
                  </div>
                )}
                {apiKeyMode === "unified" && (
                  <input
                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                    type="password"
                    value={unifiedApiKey}
                    onChange={(e) => props.onUnifiedApiKeyChange(e.target.value)}
                    placeholder="所有 OpenRouter Agent 共用"
                  />
                )}
              </div>
              {/* Participants section */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-700">参与者配置</p>
                {participants.map((participant, index) => {
                  const selectedProfile =
                    profiles.find((profile) => profile.id === participant.profileId) ?? null;
                  const infoRole =
                    participant.roleTitle || selectedProfile?.roleTitle || "No role title";
                  return (
                    <div
                      key={participant.id}
                      className="space-y-2 rounded-xl border border-slate-200 p-3"
                    >
                      <p className="text-xs font-semibold text-slate-700">参与者 {index + 1}</p>
                      <select
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                        value={participant.storyFilter}
                        onChange={(event) =>
                          props.onUpdateParticipant(index, {
                            storyFilter: event.target.value,
                            profileId: "",
                          })
                        }
                      >
                        <option value="all">All stories</option>
                        <option value="__none__">No story</option>
                        {stories.map((storyName) => (
                          <option key={storyName} value={storyName}>
                            {storyName}
                          </option>
                        ))}
                      </select>
                      <select
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                        onChange={(event) =>
                          props.onApplyProfileToParticipant(index, event.target.value)
                        }
                        value={participant.profileId}
                      >
                        <option value="">Apply profile (optional)</option>
                        {filterProfilesByStory(profiles, participant.storyFilter).map((profile) => (
                          <option key={profile.id} value={profile.id}>
                            {profile.name}
                            {profile.story ? ` · ${profile.story}` : ""}
                          </option>
                        ))}
                      </select>
                      <input
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                        value={participant.label}
                        onChange={(event) =>
                          props.onUpdateParticipant(index, { label: event.target.value })
                        }
                        placeholder="Agent label"
                      />
                      {(participant.avatarUrl || participant.profileId) && (
                        <div className="flex items-stretch gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
                          <div className="flex w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white">
                            {participant.avatarUrl ? (
                              <img
                                src={participant.avatarUrl}
                                alt={`${participant.label} avatar`}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <span className="text-xs font-semibold text-slate-500">
                                {avatarLabel(participant.label)}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1 text-xs text-slate-700">
                            <p>
                              <span className="font-semibold text-slate-500">Role:</span> {infoRole}
                            </p>
                          </div>
                        </div>
                      )}
                      <ModelPicker
                        selected={participant.model}
                        onSelect={(model) => props.onUpdateParticipant(index, { model })}
                        featuredModels={modelPickerCatalog.featuredModels}
                        moreModels={modelPickerCatalog.moreModels}
                      />
                      <select
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                        value={participant.providerType}
                        onChange={(event) =>
                          props.onUpdateParticipant(index, {
                            providerType: event.target.value as ProviderType,
                          })
                        }
                      >
                        <option value="openrouter">OpenRouter</option>
                        <option value="custom">Custom Provider</option>
                      </select>
                      {(participant.providerType === "custom" ||
                        (participant.providerType === "openrouter" &&
                          apiKeyMode === "by_agent")) && (
                        <input
                          className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                          type="password"
                          value={participant.apiKey}
                          onChange={(event) =>
                            props.onUpdateParticipant(index, { apiKey: event.target.value })
                          }
                          placeholder={
                            participant.providerType === "openrouter"
                              ? "OpenRouter API Key for this agent"
                              : "API Key"
                          }
                        />
                      )}
                      {participant.providerType === "custom" && (
                        <input
                          className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                          value={participant.baseUrl}
                          onChange={(event) =>
                            props.onUpdateParticipant(index, { baseUrl: event.target.value })
                          }
                          placeholder="Base URL, e.g. https://api.openai.com/v1"
                        />
                      )}
                      <input
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                        value={participant.roleTitle}
                        onChange={(event) =>
                          props.onUpdateParticipant(index, { roleTitle: event.target.value })
                        }
                        placeholder="Role title"
                      />
                      <textarea
                        className="h-20 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                        value={participant.character}
                        onChange={(event) =>
                          props.onUpdateParticipant(index, { character: event.target.value })
                        }
                        placeholder="Personality prompt"
                      />
                    </div>
                  );
                })}
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-1 text-sm"
                  onClick={props.onAddParticipant}
                >
                  Add Participant
                </button>
              </div>
              {/* Summarizer toggle */}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={summarizerEnabled}
                  onChange={(e) => props.onSummarizerEnabledChange(e.target.checked)}
                />
                启用 Summarizer
              </label>
              {summarizerEnabled && (
                <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                  <p className="text-xs font-semibold text-slate-700">Summarizer</p>
                  <select
                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                    value={summarizer.storyFilter}
                    onChange={(event) =>
                      props.onSummarizerChange((current) => ({
                        ...current,
                        storyFilter: event.target.value,
                        profileId: "",
                      }))
                    }
                  >
                    <option value="all">All stories</option>
                    <option value="__none__">No story</option>
                    {stories.map((storyName) => (
                      <option key={storyName} value={storyName}>
                        {storyName}
                      </option>
                    ))}
                  </select>
                  <select
                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                    onChange={(event) => props.onApplyProfileToSummarizer(event.target.value)}
                    value={summarizer.profileId}
                  >
                    <option value="">Apply profile (optional)</option>
                    {filterProfilesByStory(profiles, summarizer.storyFilter).map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                        {profile.story ? ` · ${profile.story}` : ""}
                      </option>
                    ))}
                  </select>
                  <input
                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                    value={summarizer.label}
                    onChange={(event) =>
                      props.onSummarizerChange((current) => ({
                        ...current,
                        label: event.target.value,
                      }))
                    }
                    placeholder="Label"
                  />
                  <ModelPicker
                    selected={summarizer.model}
                    onSelect={(model) =>
                      props.onSummarizerChange((current) => ({ ...current, model }))
                    }
                    featuredModels={modelPickerCatalog.featuredModels}
                    moreModels={modelPickerCatalog.moreModels}
                  />
                  <select
                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                    value={summarizer.providerType}
                    onChange={(event) =>
                      props.onSummarizerChange((current) => ({
                        ...current,
                        providerType: event.target.value as ProviderType,
                      }))
                    }
                  >
                    <option value="openrouter">OpenRouter</option>
                    <option value="custom">Custom Provider</option>
                  </select>
                  {(summarizer.providerType === "custom" ||
                    (summarizer.providerType === "openrouter" && apiKeyMode === "by_agent")) && (
                    <input
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                      type="password"
                      value={summarizer.apiKey}
                      onChange={(event) =>
                        props.onSummarizerChange((current) => ({
                          ...current,
                          apiKey: event.target.value,
                        }))
                      }
                      placeholder={
                        summarizer.providerType === "openrouter"
                          ? "OpenRouter API Key for summarizer"
                          : "API Key"
                      }
                    />
                  )}
                  {summarizer.providerType === "custom" && (
                    <input
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                      value={summarizer.baseUrl}
                      onChange={(event) =>
                        props.onSummarizerChange((current) => ({
                          ...current,
                          baseUrl: event.target.value,
                        }))
                      }
                      placeholder="Base URL"
                    />
                  )}
                  <input
                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                    value={summarizer.roleTitle}
                    onChange={(event) =>
                      props.onSummarizerChange((current) => ({
                        ...current,
                        roleTitle: event.target.value,
                      }))
                    }
                    placeholder="Role title"
                  />
                  <textarea
                    className="h-20 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                    value={summarizer.character}
                    onChange={(event) =>
                      props.onSummarizerChange((current) => ({
                        ...current,
                        character: event.target.value,
                      }))
                    }
                    placeholder="Personality prompt"
                  />
                </div>
              )}
              {/* Manual create session */}
              <form onSubmit={props.onCreateSession}>
                <button
                  type="submit"
                  disabled={!canCreate}
                  className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
                >
                  Create Session (Advanced)
                </button>
              </form>
            </div>
          )}

          <button
            type="button"
            disabled={!quickStartModel}
            onClick={() => props.onSetupStepChange(3)}
            className="mt-4 w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            下一步 →
          </button>
        </div>
      )}

      {/* Step 3: 确认 & 开始 */}
      {setupStep === 3 && (
        <div className="mt-4 flex-1">
          <button
            type="button"
            onClick={() => props.onSetupStepChange(2)}
            className="mb-3 text-xs text-slate-500 hover:text-slate-700"
          >
            ← 返回
          </button>
          <p className="mb-3 text-sm font-semibold text-slate-800">确认阵容</p>
          <div className="space-y-2 rounded-xl border border-slate-200 p-3">
            <p className="text-xs font-medium text-slate-500">{selectedStory}</p>
            {selectedStoryMembers.map((m, i) => (
              <div key={m.id} className="flex items-center gap-2">
                <div className="h-8 w-8 overflow-hidden rounded-full">
                  <img
                    src={m.avatarUrl || getDefaultAvatarUrl(i)}
                    alt={m.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-800">{m.name}</p>
                  <p className="text-[10px] text-slate-500">{m.roleTitle}</p>
                </div>
                <span className="text-[10px] text-slate-400">
                  {quickStartModel.split("/")[1] ?? quickStartModel}
                </span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => props.onQuickStartStory(selectedStory)}
            className="mt-4 w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white"
          >
            开始对话 ▶
          </button>
        </div>
      )}
    </div>
  );
}
