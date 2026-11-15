export type ProductStatus = "Live" | "Beta" | "Paused";

export interface ProductStep {
  title: string;
  body: string;
}

export type ProductVisual =
  | { kind: "image"; src: string; alt: string; width: number; height: number }
  | { kind: "transcript"; title: string; lines: { speaker?: "you" | "agent" | "note"; text: string }[] }
  | { kind: "code"; title: string; code: string; caption: string };

export interface Product {
  /** Used as the URL hash (#slug) that opens this product's details. */
  slug: string;
  name: string;
  tagline: string;
  description: string;
  highlights: string[];
  status: ProductStatus;
  statusNote: string;
  href: string;
  hrefLabel: string;
  external?: boolean;
  repo: string;
  secondary?: { label: string; href: string };
  accent: string;
  mark: string;
  logo?: string;
  details: {
    pitch: string;
    steps: ProductStep[];
    principlesTitle: string;
    principles: string[];
    audience: string;
    visual: ProductVisual;
    links: { label: string; href: string }[];
  };
}

export const POLARBEAR_URL = "https://polarbear-frontend-vcpindq3cq-uc.a.run.app";

export const PRODUCTS: Product[] = [
  {
    slug: "trading-agent",
    name: "Trading Agent",
    tagline: "It proposes. You approve.",
    description:
      "A self-hosted trading agent that watches your strategies, explains its reasoning, and never places an order without your sign-off.",
    highlights: [
      "YAML strategies checked hourly",
      "Chat with memory on web and Telegram",
      "Nightly reflection on its own calls"
    ],
    status: "Live",
    statusNote: "Paper trading",
    href: "/trading",
    hrefLabel: "Explore Trading Agent",
    repo: "https://github.com/dukesky/allpath-trading-agent",
    secondary: { label: "Live journal", href: "/trading/journal" },
    accent: "from-emerald-500/20 to-emerald-500/0",
    mark: "📈",
    details: {
      pitch:
        "An open-source LLM trading agent you run on your own machine. You write the plan once; it watches the market, talks it through with you, reflects after every close — and puts a human approval gate in front of every order.",
      steps: [
        {
          title: "Write the plan once",
          body: "Strategies are plain YAML: a thesis, a target weight, and rules like price < 140 → sell all. Or describe the plan in chat and approve the draft."
        },
        {
          title: "It checks every hour",
          body: "During market hours a sentinel evaluates each active strategy, fires rules, and queues anything that needs a decision."
        },
        {
          title: "Talk to it anywhere",
          body: "Browser or Telegram, same agent, same memory: your profile, strategies, per-stock notes and lessons, consolidated nightly."
        },
        {
          title: "It reflects after the close",
          body: "A bounded review re-reads the day, writes lessons into memory, and proposes a strategy revision when a thesis has drifted."
        }
      ],
      principlesTitle: "Guardrails",
      principles: [
        "The agent can only propose — a human clicks Approve on every order",
        "Position caps and daily limits are deterministic code the model can't reach around",
        "Strategy edits arrive as side-by-side diffs and change nothing until approved",
        "Paper trading by default; live trading is a deliberate config change"
      ],
      audience: "Retail investors who want a disciplined second brain for their own rules — not a black box that trades for them.",
      visual: {
        kind: "image",
        src: "/trading/dashboard-dark.png",
        alt: "Dashboard: equity curve, positions table and compact strategy cards (demo data).",
        width: 2560,
        height: 2360
      },
      links: [
        { label: "Full walkthrough", href: "/trading" },
        { label: "Live paper-trading journal", href: "/trading/journal" },
        { label: "Research paper (PDF)", href: "/trading/allpath-paper-ai4f-2026.pdf" }
      ]
    }
  },
  {
    slug: "personal-agent",
    name: "Personal Agent",
    tagline: "A local agent that teaches itself to you.",
    description:
      "Starts as a plain chat and adds one capability at a time — connect a model, link Telegram, schedule a morning briefing — all on your own machine.",
    highlights: [
      "Runs locally, your data stays put",
      "Every side effect needs your approval",
      "Grows with you, one step at a time"
    ],
    status: "Beta",
    statusNote: "Open source",
    href: "/agent",
    hrefLabel: "Explore Personal Agent",
    repo: "https://github.com/dukesky/allpath-agent",
    accent: "from-sky-500/20 to-sky-500/0",
    mark: "🧭",
    details: {
      pitch:
        "Most agents hand you fifty tools and a manual. This one starts as a plain chat and introduces one capability at a time — when your messages show you're ready, and only until you've actually used it.",
      steps: [
        {
          title: "Install in one line",
          body: "The installer manages Python and a private virtualenv, then opens your first conversation — no API key needed to look around."
        },
        {
          title: "Connect a model in the chat",
          body: "Say “connect a model”. Use a Claude Code or Codex account, or a key from Anthropic, OpenAI, Gemini or Grok — entered hidden and verified."
        },
        {
          title: "Link Telegram",
          body: "A four-step guided flow around BotFather, and the bot answers you from your phone minutes later."
        },
        {
          title: "Schedule a briefing",
          body: "Ask for a news briefing every morning at 7. It confirms the plan, and tomorrow it's just there."
        }
      ],
      principlesTitle: "Safety model",
      principles: [
        "Writing files, running commands and browsing ask first, with exact arguments shown",
        "API keys and bot tokens never enter the conversation, model context or logs",
        "Scheduled runs can't use side-effect tools — denied requests are flagged, not hidden",
        "Plain Python, SQLite and TOML on your machine; only your configured model calls leave it"
      ],
      audience: "People who want a personal assistant on their own computer, with their own keys, and no dashboard scavenger hunt.",
      visual: {
        kind: "transcript",
        title: "allpath-agent",
        lines: [
          { speaker: "you", text: "send me a news briefing every morning at 7" },
          { speaker: "note", text: "● create_automation · guided flow" },
          { speaker: "agent", text: "Please confirm this automation:" },
          { speaker: "agent", text: "• Morning brief — every day, 7:00 America/Los_Angeles" },
          { speaker: "agent", text: "• Delivered to: telegram · this conversation" },
          { speaker: "you", text: "yes" },
          { speaker: "agent", text: "Saved. Next run: tomorrow 07:00." },
          { speaker: "note", text: "NEXT · workspace_files — start in a project folder and ask it to explain the codebase" }
        ]
      },
      links: [
        { label: "Full walkthrough", href: "/agent" },
        { label: "Source on GitHub", href: "https://github.com/dukesky/allpath-agent" }
      ]
    }
  },
  {
    slug: "polarbear",
    name: "PolarBear",
    tagline: "Hybrid search for small businesses.",
    description:
      "No-code, AI-enhanced site search for SMEs: upload a product CSV, paste two lines of code, and shoppers get keyword plus semantic search.",
    highlights: [
      "Keyword + semantic vector search",
      "Embeds in Shopify, WordPress, Wix",
      "Search and click analytics"
    ],
    status: "Beta",
    statusNote: "Demo online",
    href: POLARBEAR_URL,
    hrefLabel: "Open PolarBear",
    external: true,
    repo: "https://github.com/dukesky/PolarBear",
    accent: "from-indigo-500/20 to-indigo-500/0",
    mark: "🐻‍❄️",
    logo: "/polarbear-logo.png",
    details: {
      pitch:
        "Professional site search without an enterprise contract. PolarBear combines keyword search (Meilisearch) with semantic vector search (FAISS), so “cozy gift” finds your scented candles — and it's fully open source.",
      steps: [
        {
          title: "Upload your products",
          body: "A CSV with product names, descriptions and prices. Images optional."
        },
        {
          title: "Copy your embed code",
          body: "The Settings page generates it, with step-by-step guides for Shopify, WordPress and Wix."
        },
        {
          title: "Paste it into your site",
          body: "Drop it into your site builder's custom-code box. Shoppers get a search-as-you-type overlay."
        },
        {
          title: "Watch what people search",
          body: "A dashboard shows what shoppers searched for and clicked, so you can spot gaps in your catalog."
        }
      ],
      principlesTitle: "Why it's different",
      principles: [
        "Hybrid ranking: exact keyword matches plus meaning-based results",
        "No-code setup aimed at store owners, not search engineers",
        "MIT-licensed — self-host it, or use the hosted multi-tenant version",
        "A demo storefront ships with the repo to try both sides in minutes"
      ],
      audience: "Small and medium-sized online stores that have outgrown their platform's default search.",
      visual: {
        kind: "code",
        title: "Add search to your store",
        code: '<div id="polarbear-search"></div>\n<script\n  src="https://<your-server>/widget.js"\n  data-key="pb_search_..."\n  async></script>',
        caption: "Two lines in your site's custom-code box — that's the whole integration."
      },
      links: [
        { label: "Open the demo", href: POLARBEAR_URL },
        { label: "Integration guide", href: "https://github.com/dukesky/PolarBear/blob/main/docs/INTEGRATION.md" }
      ]
    }
  }
];
