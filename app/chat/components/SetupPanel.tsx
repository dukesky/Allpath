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
  SetupSection,
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
  // Setup sections
  setupSections: { quickStart: boolean; sessionRules: boolean; participants: boolean; summarizer: boolean };
  onToggleSection: (section: keyof SetupPanelProps["setupSections"]) => void;
  // Quick start
  quickStartModel: string;
  quickStartStories: Array<{ story: string; members: AgentProfile[] }>;
  modelPickerCatalog: { featuredModels: CatalogModel[]; moreModels: CatalogModel[] };
  onQuickStartModelChange: (model: string) => void;
  onQuickStartStory: (story: string) => void;
  // Session rules
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
  // Participants
  participants: ParticipantForm[];
  profiles: AgentProfile[];
  stories: string[];
  onUpdateParticipant: (index: number, patch: Partial<ParticipantForm>) => void;
  onApplyProfileToParticipant: (index: number, profileId: string) => void;
  onAddParticipant: () => void;
  // Summarizer
  summarizerEnabled: boolean;
  summarizer: ParticipantForm;
  onSummarizerEnabledChange: (enabled: boolean) => void;
  onSummarizerChange: (updater: (current: ParticipantForm) => ParticipantForm) => void;
  onApplyProfileToSummarizer: (profileId: string) => void;
  // Submit
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

export function SetupPanel({
  trialStatus,
  inviteCode,
  isRedeemingInvite,
  onInviteCodeChange,
  onRedeemInvite,
  setupSections,
  onToggleSection,
  quickStartModel,
  quickStartStories,
  modelPickerCatalog,
  onQuickStartModelChange,
  onQuickStartStory,
  apiKeyMode,
  defaultProfileApiKey,
  unifiedApiKey,
  promptPresets,
  selectedPromptPresetId,
  customInitialPrompt,
  hasServerOpenRouterAccess,
  onApiKeyModeChange,
  onUnifiedApiKeyChange,
  onPromptPresetChange,
  onCustomInitialPromptChange,
  participants,
  profiles,
  stories,
  onUpdateParticipant,
  onApplyProfileToParticipant,
  onAddParticipant,
  summarizerEnabled,
  summarizer,
  onSummarizerEnabledChange,
  onSummarizerChange,
  onApplyProfileToSummarizer,
  canCreate,
  onCreateSession,
}: SetupPanelProps) {
  const selectedPromptPreset = promptPresets.find((preset) => preset.id === selectedPromptPresetId);

  return (
    <section className="h-full min-h-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mt-1 flex gap-3">
        <Link className="inline-block text-sm font-medium text-primary" href="/agents">
          Open Agent Personality Studio
        </Link>
        <Link className="inline-block text-sm font-medium text-primary" href="/profile">
          Open User Profile
        </Link>
      </div>

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

      <div className="mt-4">
        <SetupSection
          title="Quick Start"
          summary="Pick a story and create a round-table session instantly. If no OpenRouter key is available, you will be prompted to set one."
          open={setupSections.quickStart}
          onToggle={() => onToggleSection("quickStart")}
        >
          <div className="space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {modelPickerCatalog.featuredModels.map((model) => {
                const active = quickStartModel === model.id;
                return (
                  <button
                    key={`quick-start-${model.id}`}
                    className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs ${
                      active
                        ? "border-primary bg-primary text-white"
                        : "border-slate-300 bg-white text-slate-700"
                    }`}
                    onClick={() => onQuickStartModelChange(model.id)}
                    type="button"
                  >
                    <span className="flex items-center gap-1">
                      {model.label}
                      {isNew(model) && (
                        <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-medium text-teal-700">
                          New
                        </span>
                      )}
                      {isPopular(model) && (
                        <span className="text-[11px]" title="Popular">
                          🔥
                        </span>
                      )}
                      <span className="opacity-60">{model.price}</span>
                    </span>
                  </button>
                );
              })}
            </div>

          <div className="flex gap-3 overflow-x-auto pb-1">
            {quickStartStories.map(({ story, members }) => (
              <div
                key={story}
                className="w-[240px] min-w-[240px] max-w-[240px] shrink-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="flex -space-x-2">
                  {members.slice(0, 4).map((member, memberIndex) => (
                    <div key={member.id} className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-white bg-slate-100">
                      <img
                        alt={member.name}
                        className="h-full w-full object-cover"
                        src={member.avatarUrl || getDefaultAvatarUrl(memberIndex)}
                      />
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">{story}</p>
                <p className="mt-1 text-xs text-slate-500">{members.length} characters ready</p>
                <p className="mt-2 min-h-[52px] whitespace-normal break-words text-xs leading-5 text-slate-600">
                  {storyExperience(story).tagline}
                </p>
                <button
                  type="button"
                  className="mt-3 w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white"
                  onClick={() => onQuickStartStory(story)}
                >
                  Start Chat
                </button>
              </div>
            ))}
          </div>
          </div>
        </SetupSection>
      </div>

      <form className="mt-4 space-y-4" onSubmit={onCreateSession}>
        <SetupSection
          title="Session Rules"
          summary="Prompt preset and API key mode used when you create a manual session."
          open={setupSections.sessionRules}
          onToggle={() => onToggleSection("sessionRules")}
        >
        <div className="space-y-2">
          <p className="text-sm font-semibold">Agent Initial Prompt (Session Rules)</p>
          <select
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            value={selectedPromptPresetId}
            onChange={(event) => onPromptPresetChange(event.target.value)}
          >
            {promptPresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
            <option value={CUSTOM_PROMPT_PRESET_ID}>Custom</option>
          </select>
          {selectedPromptPresetId === CUSTOM_PROMPT_PRESET_ID ? (
            <textarea
              className="h-28 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
              value={customInitialPrompt}
              onChange={(event) => onCustomInitialPromptChange(event.target.value)}
              placeholder="Session-level rules for all agents"
            />
          ) : (
            <textarea
              className="h-28 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-600"
              value={selectedPromptPreset?.prompt ?? ""}
              readOnly
            />
          )}
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-700">OpenRouter API Key Mode</p>
            <select
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
              value={apiKeyMode}
              onChange={(event) => onApiKeyModeChange(event.target.value as ApiKeyMode)}
            >
              <option value="default_profile">Use Default OpenRouter API Key (from User Profile)</option>
              <option value="unified">Use Unified API Key (set once here)</option>
              <option value="by_agent">Customized by Agent (each agent enters key)</option>
            </select>
            {apiKeyMode === "default_profile" && (
              <div className="space-y-2">
                <input
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-600"
                  type="password"
                  value={defaultProfileApiKey}
                  readOnly
                  placeholder="No local default key in User Profile"
                />
                {!defaultProfileApiKey.trim() && hasServerOpenRouterAccess && (
                  <p className="text-xs text-emerald-700">
                    Server-backed guest access is available, so OpenRouter sessions can still run without a local key.
                  </p>
                )}
              </div>
            )}
            {apiKeyMode === "unified" && (
              <input
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                type="password"
                value={unifiedApiKey}
                onChange={(event) => onUnifiedApiKeyChange(event.target.value)}
                placeholder="Used by all OpenRouter agents"
              />
            )}
            {apiKeyMode === "by_agent" && (
              <p className="text-xs text-slate-500">
                OpenRouter agents must provide API key in their own card.
              </p>
            )}
          </div>
        </div>
        </SetupSection>

        <SetupSection
          title="Participants"
          summary={`${participants.length} configured participants.`}
          open={setupSections.participants}
          onToggle={() => onToggleSection("participants")}
        >
        {participants.map((participant, index) => {
          const selectedProfile =
            profiles.find((profile) => profile.id === participant.profileId) ?? null;
          const infoStory = selectedProfile?.story || "No story";
          const infoRole = participant.roleTitle || selectedProfile?.roleTitle || "No role title";
          const infoCharacter =
            participant.character || selectedProfile?.character || "No personality prompt";

          return (
          <div key={participant.id} className="space-y-2 rounded-xl border border-slate-200 p-3">
            <p className="text-sm font-semibold">Participant {index + 1}</p>

            <select
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
              value={participant.storyFilter}
              onChange={(event) =>
                onUpdateParticipant(index, {
                  storyFilter: event.target.value,
                  profileId: ""
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
              onChange={(event) => onApplyProfileToParticipant(index, event.target.value)}
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
              onChange={(event) => onUpdateParticipant(index, { label: event.target.value })}
              placeholder="Agent label"
            />
            {(participant.avatarUrl || participant.profileId) && (
              <div className="flex items-stretch gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
                <div className="flex w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white">
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
                  <p><span className="font-semibold text-slate-500">Group:</span> {infoStory}</p>
                  <p><span className="font-semibold text-slate-500">Profile:</span> {participant.label}</p>
                  <p><span className="font-semibold text-slate-500">Role:</span> {infoRole}</p>
                  <p className="line-clamp-2">
                    <span className="font-semibold text-slate-500">Personality:</span> {infoCharacter}
                  </p>
                </div>
              </div>
            )}

            <ModelPicker
              selected={participant.model}
              onSelect={(model) => onUpdateParticipant(index, { model })}
              featuredModels={modelPickerCatalog.featuredModels}
              moreModels={modelPickerCatalog.moreModels}
            />

            <select
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
              value={participant.providerType}
              onChange={(event) => onUpdateParticipant(index, { providerType: event.target.value as ProviderType })}
            >
              <option value="openrouter">OpenRouter</option>
              <option value="custom">Custom Provider</option>
            </select>

            {(participant.providerType === "custom" ||
              (participant.providerType === "openrouter" && apiKeyMode === "by_agent")) && (
              <input
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                type="password"
                value={participant.apiKey}
                onChange={(event) => onUpdateParticipant(index, { apiKey: event.target.value })}
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
                onChange={(event) => onUpdateParticipant(index, { baseUrl: event.target.value })}
                placeholder="Base URL, e.g. https://api.openai.com/v1"
              />
            )}

            <input
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
              value={participant.roleTitle}
              onChange={(event) => onUpdateParticipant(index, { roleTitle: event.target.value })}
              placeholder="Role title (e.g. Risk Reviewer)"
            />

            <textarea
              className="h-20 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
              value={participant.character}
              onChange={(event) => onUpdateParticipant(index, { character: event.target.value })}
              placeholder="Personality prompt"
            />
          </div>
        )})}

        <button
          type="button"
          className="rounded-md border border-slate-300 px-3 py-1 text-sm"
          onClick={onAddParticipant}
        >
          Add Participant
        </button>
        </SetupSection>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={summarizerEnabled}
            onChange={(event) => onSummarizerEnabledChange(event.target.checked)}
          />
          Enable Summarizer
        </label>

        {summarizerEnabled && (
          <SetupSection
            title="Summarizer"
            summary="Optional final synthesis agent."
            open={setupSections.summarizer}
            onToggle={() => onToggleSection("summarizer")}
          >
          <div className="space-y-2">
            <p className="text-sm font-semibold">Summarizer</p>
            {(() => {
              const selectedProfile =
                profiles.find((profile) => profile.id === summarizer.profileId) ?? null;
              const infoStory = selectedProfile?.story || "No story";
              const infoRole = summarizer.roleTitle || selectedProfile?.roleTitle || "No role title";
              const infoCharacter =
                summarizer.character || selectedProfile?.character || "No personality prompt";
              return (
                <>

            <select
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
              value={summarizer.storyFilter}
              onChange={(event) =>
                onSummarizerChange((current) => ({
                  ...current,
                  storyFilter: event.target.value,
                  profileId: ""
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
              onChange={(event) => onApplyProfileToSummarizer(event.target.value)}
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
              onChange={(event) => onSummarizerChange((current) => ({ ...current, label: event.target.value }))}
              placeholder="Label"
            />
            {(summarizer.avatarUrl || summarizer.profileId) && (
              <div className="flex items-stretch gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
                <div className="flex w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white">
                  {summarizer.avatarUrl ? (
                    <img
                      src={summarizer.avatarUrl}
                      alt={`${summarizer.label} avatar`}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-slate-500">
                      {avatarLabel(summarizer.label)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1 text-xs text-slate-700">
                  <p><span className="font-semibold text-slate-500">Group:</span> {infoStory}</p>
                  <p><span className="font-semibold text-slate-500">Profile:</span> {summarizer.label}</p>
                  <p><span className="font-semibold text-slate-500">Role:</span> {infoRole}</p>
                  <p className="line-clamp-2">
                    <span className="font-semibold text-slate-500">Personality:</span> {infoCharacter}
                  </p>
                </div>
              </div>
            )}

            <ModelPicker
              selected={summarizer.model}
              onSelect={(model) => onSummarizerChange((current) => ({ ...current, model }))}
              featuredModels={modelPickerCatalog.featuredModels}
              moreModels={modelPickerCatalog.moreModels}
            />

            <select
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
              value={summarizer.providerType}
              onChange={(event) =>
                onSummarizerChange((current) => ({
                  ...current,
                  providerType: event.target.value as ProviderType
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
                  onSummarizerChange((current) => ({ ...current, apiKey: event.target.value }))
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
                onChange={(event) => onSummarizerChange((current) => ({ ...current, baseUrl: event.target.value }))}
                placeholder="Base URL"
              />
            )}

            <input
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
              value={summarizer.roleTitle}
              onChange={(event) => onSummarizerChange((current) => ({ ...current, roleTitle: event.target.value }))}
              placeholder="Role title"
            />

            <textarea
              className="h-20 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
              value={summarizer.character}
              onChange={(event) => onSummarizerChange((current) => ({ ...current, character: event.target.value }))}
              placeholder="Personality prompt"
            />
                </>
              );
            })()}
          </div>
          </SetupSection>
        )}

        <button
          type="submit"
          disabled={!canCreate}
          className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Create Session
        </button>
      </form>
    </section>
  );
}
