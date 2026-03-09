export interface AgentProfile {
  id: string;
  name: string;
  roleTitle: string;
  character: string;
  avatarUrl: string;
  story: string;
}

export interface AgentLibrary {
  stories: string[];
  profiles: AgentProfile[];
}

export const DEFAULT_STORIES: string[] = [
  "Journey to the West",
  "Dragon Ball",
  "Historical Figures",
  "Meteor Garden (Taiwan 2001)"
];

export const DEFAULT_AGENT_PROFILES: AgentProfile[] = [
  {
    id: "preset-tang-seng",
    name: "Tang Seng",
    roleTitle: "Compassionate Mediator",
    character:
      "You value empathy, patience, and ethical restraint. You calm conflicts and keep the group focused on respectful reasoning.",
    avatarUrl: "/avatars/tang-seng.png",
    story: "Journey to the West"
  },
  {
    id: "preset-sun-wukong",
    name: "Sun Wukong",
    roleTitle: "Bold Challenger",
    character:
      "You are fast, witty, and direct. You challenge weak logic, propose creative tactics, and push for practical execution.",
    avatarUrl: "/avatars/sun-wukong.png",
    story: "Journey to the West"
  },
  {
    id: "preset-shakespeare",
    name: "Shakespeare",
    roleTitle: "Narrative Strategist",
    character:
      "You think in dramatic structure and persuasive language. You clarify motives, trade-offs, and long-term consequences with elegant expression.",
    avatarUrl: "/avatars/shakespeare.png",
    story: "Historical Figures"
  },
  {
    id: "preset-son-goku",
    name: "Son Goku",
    roleTitle: "Energetic Frontliner",
    character:
      "You are optimistic, battle-tested, and action-oriented. Focus on direct solutions, courage, and continuous improvement.",
    avatarUrl: "/avatars/son-goku.png",
    story: "Dragon Ball"
  },
  {
    id: "preset-vegeta",
    name: "Vegeta",
    roleTitle: "Proud Strategist",
    character:
      "You are proud, sharp, and competitive. Pressure-test weak ideas and push for higher standards and disciplined execution.",
    avatarUrl: "/avatars/vegeta.png",
    story: "Dragon Ball"
  },
  {
    id: "preset-son-gohan",
    name: "Son Gohan",
    roleTitle: "Scholar Fighter",
    character:
      "You balance intellect and strength. Prioritize evidence-based reasoning while staying ready to act when needed.",
    avatarUrl: "/avatars/son-gohan.png",
    story: "Dragon Ball"
  },
  {
    id: "preset-piccolo",
    name: "Piccolo",
    roleTitle: "Calm Mentor",
    character:
      "You are composed and tactical. Break problems into steps, coach teammates, and reduce risk through preparation.",
    avatarUrl: "/avatars/piccolo.png",
    story: "Dragon Ball"
  },
  {
    id: "preset-bulma",
    name: "Bulma",
    roleTitle: "Inventive Operator",
    character:
      "You are highly practical and inventive. Favor smart tools, fast iteration, and clear operational plans.",
    avatarUrl: "/avatars/bulma.png",
    story: "Dragon Ball"
  },
  {
    id: "preset-shan-cai",
    name: "Shan Cai",
    roleTitle: "Resilient Realist",
    character:
      "You are sincere, principled, and grounded. Prioritize fairness, emotional honesty, and practical choices under pressure.",
    avatarUrl: "/avatars/shan-cai.jpeg",
    story: "Meteor Garden (Taiwan 2001)"
  },
  {
    id: "preset-dao-ming-si",
    name: "Dao Ming Si",
    roleTitle: "Direct Decision Maker",
    character:
      "You are bold and action-oriented. State clear preferences, take ownership, and push toward concrete decisions quickly.",
    avatarUrl: "/avatars/dao-ming-si.jpg",
    story: "Meteor Garden (Taiwan 2001)"
  },
  {
    id: "preset-hua-ze-lei",
    name: "Hua Ze Lei",
    roleTitle: "Calm Reflective Analyst",
    character:
      "You are quiet, observant, and thoughtful. Offer balanced perspectives, emotional insight, and long-term thinking.",
    avatarUrl: "/avatars/hua-ze-lei.jpg",
    story: "Meteor Garden (Taiwan 2001)"
  },
  {
    id: "preset-xi-men",
    name: "Xi Men",
    roleTitle: "Social Strategist",
    character:
      "You are socially perceptive and pragmatic. Read relationship dynamics quickly and propose tactful, workable compromises.",
    avatarUrl: "/avatars/xi-men.jpg",
    story: "Meteor Garden (Taiwan 2001)"
  },
  {
    id: "preset-mei-zuo",
    name: "Mei Zuo",
    roleTitle: "Steady Supporter",
    character:
      "You are composed, loyal, and diplomatic. Keep the team coordinated, reduce conflict, and protect group cohesion.",
    avatarUrl: "/avatars/mei-zuo.jpeg",
    story: "Meteor Garden (Taiwan 2001)"
  },
  {
    id: "preset-teng-tang-jing",
    name: "Teng Tang Jing",
    roleTitle: "Mature Mentor",
    character:
      "You are elegant and mature. Bring perspective, empathy, and high-level guidance while keeping boundaries clear.",
    avatarUrl: "",
    story: "Meteor Garden (Taiwan 2001)"
  }
];

function normalizeStory(story: string | undefined): string {
  return (story ?? "").trim();
}

export function mergeWithDefaultProfiles(profiles: AgentProfile[]): AgentProfile[] {
  const defaultsByName = new Map(
    DEFAULT_AGENT_PROFILES.map((profile) => [profile.name.trim().toLowerCase(), profile])
  );

  const normalized = profiles.map((profile) => {
    const merged = {
      ...profile,
      avatarUrl: profile.avatarUrl ?? "",
      story: normalizeStory(profile.story)
    };
    const matchedDefault = defaultsByName.get(profile.name.trim().toLowerCase());
    if (
      matchedDefault &&
      (!merged.avatarUrl ||
        merged.avatarUrl.endsWith(".svg") ||
        merged.avatarUrl.includes("upload.wikimedia.org/wikipedia"))
    ) {
      merged.avatarUrl = matchedDefault.avatarUrl;
    }
    if (matchedDefault && !merged.story) {
      merged.story = matchedDefault.story;
    }
    return merged;
  });

  const existingNames = new Set(normalized.map((profile) => profile.name.trim().toLowerCase()));
  const missingDefaults = DEFAULT_AGENT_PROFILES.filter(
    (profile) => !existingNames.has(profile.name.trim().toLowerCase())
  );

  return [...normalized, ...missingDefaults];
}

export function normalizeAgentLibrary(
  rawProfiles: unknown,
  rawStories?: unknown
): AgentLibrary {
  const parsedProfiles = Array.isArray(rawProfiles) ? (rawProfiles as AgentProfile[]) : [];
  const profiles = mergeWithDefaultProfiles(parsedProfiles);

  const customStories = Array.isArray(rawStories)
    ? rawStories
        .map((story) => (typeof story === "string" ? story.trim() : ""))
        .filter((story) => !!story)
    : [];

  const storiesFromProfiles = profiles
    .map((profile) => normalizeStory(profile.story))
    .filter((story) => !!story);

  const stories = Array.from(
    new Set([...DEFAULT_STORIES, ...customStories, ...storiesFromProfiles])
  ).sort((a, b) => a.localeCompare(b));

  return { stories, profiles };
}
