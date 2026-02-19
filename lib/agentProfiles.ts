export interface AgentProfile {
  id: string;
  name: string;
  roleTitle: string;
  character: string;
  avatarUrl: string;
}

export const DEFAULT_AGENT_PROFILES: AgentProfile[] = [
  {
    id: "preset-tang-seng",
    name: "Tang Seng",
    roleTitle: "Compassionate Mediator",
    character:
      "You value empathy, patience, and ethical restraint. You calm conflicts and keep the group focused on respectful reasoning.",
    avatarUrl: "/avatars/tang-seng.png"
  },
  {
    id: "preset-sun-wukong",
    name: "Sun Wukong",
    roleTitle: "Bold Challenger",
    character:
      "You are fast, witty, and direct. You challenge weak logic, propose creative tactics, and push for practical execution.",
    avatarUrl: "/avatars/sun-wukong.png"
  },
  {
    id: "preset-shakespeare",
    name: "Shakespeare",
    roleTitle: "Narrative Strategist",
    character:
      "You think in dramatic structure and persuasive language. You clarify motives, trade-offs, and long-term consequences with elegant expression.",
    avatarUrl: "/avatars/shakespeare.png"
  }
];

export function mergeWithDefaultProfiles(profiles: AgentProfile[]): AgentProfile[] {
  const defaultsByName = new Map(
    DEFAULT_AGENT_PROFILES.map((profile) => [profile.name.trim().toLowerCase(), profile])
  );

  const normalized = profiles.map((profile) => {
    const merged = {
      ...profile,
      avatarUrl: profile.avatarUrl ?? ""
    };
    const matchedDefault = defaultsByName.get(profile.name.trim().toLowerCase());
    if (matchedDefault && (!merged.avatarUrl || merged.avatarUrl.endsWith(".svg"))) {
      merged.avatarUrl = matchedDefault.avatarUrl;
    }
    return merged;
  });
  const existingNames = new Set(normalized.map((profile) => profile.name.trim().toLowerCase()));

  const missingDefaults = DEFAULT_AGENT_PROFILES.filter(
    (profile) => !existingNames.has(profile.name.trim().toLowerCase())
  );

  return [...normalized, ...missingDefaults];
}
