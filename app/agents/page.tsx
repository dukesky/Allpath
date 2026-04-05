"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { normalizeAgentLibrary, AgentProfile } from "@/lib/agentProfiles";
import { readImageFileAsDataUrl } from "@/lib/avatar";

const PROFILE_STORAGE_KEY = "allpath-agent-profiles";
const STORY_STORAGE_KEY = "allpath-agent-stories";

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

export default function AgentsPage() {
  const [profiles, setProfiles] = useState<AgentProfile[]>([]);
  const [stories, setStories] = useState<string[]>([]);
  const [storyInput, setStoryInput] = useState("");
  const [storyFilter, setStoryFilter] = useState("all");
  const [name, setName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [character, setCharacter] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [story, setStory] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const parsedProfiles = parseLocalJson<AgentProfile[]>(
      localStorage.getItem(PROFILE_STORAGE_KEY),
      []
    );
    const parsedStories = parseLocalJson<string[]>(
      localStorage.getItem(STORY_STORAGE_KEY),
      []
    );
    const normalized = normalizeAgentLibrary(parsedProfiles, parsedStories);
    setProfiles(normalized.profiles);
    setStories(normalized.stories);
  }, []);

  useEffect(() => {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem(STORY_STORAGE_KEY, JSON.stringify(stories));
  }, [stories]);

  const visibleProfiles = useMemo(() => {
    if (storyFilter === "all") {
      return profiles;
    }
    if (storyFilter === "__none__") {
      return profiles.filter((profile) => !profile.story.trim());
    }
    return profiles.filter((profile) => profile.story === storyFilter);
  }, [profiles, storyFilter]);

  function addStory() {
    const normalized = storyInput.trim();
    if (!normalized) {
      return;
    }
    setStories((current) =>
      current.some((item) => item.toLowerCase() === normalized.toLowerCase())
        ? current
        : [...current, normalized].sort((a, b) => a.localeCompare(b))
    );
    setStoryInput("");
  }

  function removeStory(nameToRemove: string) {
    setStories((current) => current.filter((item) => item !== nameToRemove));
    setProfiles((current) =>
      current.map((profile) =>
        profile.story === nameToRemove ? { ...profile, story: "" } : profile
      )
    );
    if (storyFilter === nameToRemove) {
      setStoryFilter("all");
    }
  }

  function addProfile(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    setProfiles((current) => [
      ...current,
      {
        id: uid(),
        name: name.trim(),
        roleTitle: roleTitle.trim(),
        character: character.trim(),
        avatarUrl: avatarUrl.trim(),
        story: story.trim()
      }
    ]);

    if (story.trim()) {
      setStories((current) =>
        current.includes(story.trim())
          ? current
          : [...current, story.trim()].sort((a, b) => a.localeCompare(b))
      );
    }

    setName("");
    setRoleTitle("");
    setCharacter("");
    setAvatarUrl("");
    setStory("");
  }

  function updateProfile(id: string, patch: Partial<AgentProfile>) {
    setProfiles((current) =>
      current.map((profile) => (profile.id === id ? { ...profile, ...patch } : profile))
    );
  }

  function removeProfile(id: string) {
    setProfiles((current) => current.filter((profile) => profile.id !== id));
  }

  async function uploadAvatar(file: File, apply: (value: string) => void) {
    try {
      setError("");
      const dataUrl = await readImageFileAsDataUrl(file);
      apply(dataUrl);
    } catch (uploadError) {
      setError((uploadError as Error).message);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl p-4">
      <header className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-semibold">Agent Personality Studio</h1>
        <p className="mt-1 text-sm text-slate-600">
          Create stories and profiles. In chat setup, choose story first, then profile.
        </p>
        <div className="mt-2 flex gap-3">
          <Link className="text-sm font-medium text-primary" href="/chat">
            Back to Chat
          </Link>
          <Link className="text-sm font-medium text-primary" href="/profile">
            Open User Profile
          </Link>
        </div>
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      </header>

      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Story Library</h2>
        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Add story (e.g. Journey to the West)"
            value={storyInput}
            onChange={(event) => setStoryInput(event.target.value)}
          />
          <button
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
            onClick={addStory}
            type="button"
          >
            Add Story
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {stories.map((storyName) => (
            <span
              key={storyName}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs"
            >
              {storyName}
              <button
                className="text-rose-600"
                type="button"
                onClick={() => removeStory(storyName)}
                aria-label={`Delete ${storyName}`}
              >
                x
              </button>
            </span>
          ))}
        </div>
      </section>

      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Create Profile</h2>
        <form className="mt-3 space-y-2" onSubmit={addProfile}>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={story}
            onChange={(event) => setStory(event.target.value)}
          >
            <option value="">No story (global personality)</option>
            {stories.map((storyName) => (
              <option key={storyName} value={storyName}>
                {storyName}
              </option>
            ))}
          </select>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Profile name"
          />
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={roleTitle}
            onChange={(event) => setRoleTitle(event.target.value)}
            placeholder="Role title"
          />
          <textarea
            className="h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={character}
            onChange={(event) => setCharacter(event.target.value)}
            placeholder="Personality prompt"
          />
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-700">Avatar</p>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md bg-slate-100 text-xs font-semibold text-slate-700">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="New profile avatar" className="h-full w-full object-contain" />
                ) : (
                  "?"
                )}
              </div>
              <input
                className="text-xs"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    return;
                  }
                  void uploadAvatar(file, setAvatarUrl);
                }}
              />
              {avatarUrl && (
                <button
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                  onClick={() => setAvatarUrl("")}
                  type="button"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white" type="submit">
            Save Profile
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold">Filter Profiles</p>
          <select
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={storyFilter}
            onChange={(event) => setStoryFilter(event.target.value)}
          >
            <option value="all">All stories</option>
            <option value="__none__">No story</option>
            {stories.map((storyName) => (
              <option key={storyName} value={storyName}>
                {storyName}
              </option>
            ))}
          </select>
        </div>

        {visibleProfiles.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            No profiles in this filter.
          </div>
        )}

        {visibleProfiles.map((profile) => (
          <article key={profile.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <strong className="text-lg">{profile.name || "Untitled"}</strong>
              <button
                className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-700"
                onClick={() => removeProfile(profile.id)}
                type="button"
              >
                Delete
              </button>
            </div>
            <div className="flex gap-4">
              <div className="flex w-40 shrink-0 flex-col items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2">
                <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-lg bg-white">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={`${profile.name || "Agent"} avatar`}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-xl font-semibold text-slate-500">?</span>
                  )}
                </div>
                <div className="mt-2 w-full space-y-2">
                  <input
                    className="w-full text-xs"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) {
                        return;
                      }
                      void uploadAvatar(file, (value) => updateProfile(profile.id, { avatarUrl: value }));
                    }}
                  />
                  {profile.avatarUrl && (
                    <button
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                      onClick={() => updateProfile(profile.id, { avatarUrl: "" })}
                      type="button"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Story</p>
                  <select
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={profile.story}
                    onChange={(event) => updateProfile(profile.id, { story: event.target.value })}
                  >
                    <option value="">No story (global personality)</option>
                    {stories.map((storyName) => (
                      <option key={storyName} value={storyName}>
                        {storyName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Profile Name</p>
                  <input
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={profile.name}
                    onChange={(event) => updateProfile(profile.id, { name: event.target.value })}
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Role Title</p>
                  <input
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={profile.roleTitle}
                    onChange={(event) => updateProfile(profile.id, { roleTitle: event.target.value })}
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Personality</p>
                  <textarea
                    className="h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={profile.character}
                    onChange={(event) => updateProfile(profile.id, { character: event.target.value })}
                  />
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
