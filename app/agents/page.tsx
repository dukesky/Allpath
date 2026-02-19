"use client";

import { FormEvent, useEffect, useState } from "react";
import { DEFAULT_AGENT_PROFILES, AgentProfile, mergeWithDefaultProfiles } from "@/lib/agentProfiles";
import { readImageFileAsDataUrl } from "@/lib/avatar";

const STORAGE_KEY = "allpath-agent-profiles";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export default function AgentsPage() {
  const [profiles, setProfiles] = useState<AgentProfile[]>([]);
  const [name, setName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [character, setCharacter] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setProfiles(DEFAULT_AGENT_PROFILES);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as AgentProfile[];
      if (Array.isArray(parsed)) {
        setProfiles(mergeWithDefaultProfiles(parsed));
      } else {
        setProfiles(DEFAULT_AGENT_PROFILES);
      }
    } catch {
      setProfiles(DEFAULT_AGENT_PROFILES);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  }, [profiles]);

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
        avatarUrl: avatarUrl.trim()
      }
    ]);

    setName("");
    setRoleTitle("");
    setCharacter("");
    setAvatarUrl("");
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
          Define reusable role + personality presets. Back on home page you can apply these presets to each participant.
        </p>
        <a className="mt-2 inline-block text-sm font-medium text-primary" href="/">
          Back to Chat
        </a>
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      </header>

      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Create Profile</h2>
        <form className="mt-3 space-y-2" onSubmit={addProfile}>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Profile name (e.g. Critical Analyst)"
          />
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={roleTitle}
            onChange={(event) => setRoleTitle(event.target.value)}
            placeholder="Role title (e.g. Risk Reviewer)"
          />
          <textarea
            className="h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={character}
            onChange={(event) => setCharacter(event.target.value)}
            placeholder="Personality prompt (tone, style, constraints)"
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
        {profiles.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            No profiles yet.
          </div>
        )}

        {profiles.map((profile) => (
          <article key={profile.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <strong className="text-sm">{profile.name || "Untitled"}</strong>
              <button
                className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-700"
                onClick={() => removeProfile(profile.id)}
                type="button"
              >
                Delete
              </button>
            </div>
            <input
              className="mb-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={profile.name}
              onChange={(event) => updateProfile(profile.id, { name: event.target.value })}
            />
            <input
              className="mb-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={profile.roleTitle}
              onChange={(event) => updateProfile(profile.id, { roleTitle: event.target.value })}
            />
            <textarea
              className="h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={profile.character}
              onChange={(event) => updateProfile(profile.id, { character: event.target.value })}
            />
            <div className="mt-2 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md bg-slate-100 text-xs font-semibold text-slate-700">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={`${profile.name || "Agent"} avatar`} className="h-full w-full object-contain" />
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
                  void uploadAvatar(file, (value) => updateProfile(profile.id, { avatarUrl: value }));
                }}
              />
              {profile.avatarUrl && (
                <button
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                  onClick={() => updateProfile(profile.id, { avatarUrl: "" })}
                  type="button"
                >
                  Clear
                </button>
              )}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
