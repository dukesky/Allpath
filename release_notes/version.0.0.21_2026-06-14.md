# AllPath v0.0.21 (2026-06-14)

## What's New

### Avatar Coverage Complete
- Added 29 missing avatar images for all preset agent profiles:
  - Historical Figures: Ada Lovelace, Da Vinci, Marie Curie, Martin Luther King, Sun Tzu
  - Life Coaches Panel: Challenger, Empath, Realist, Strategist
  - Financial Advisors Board: Behavioral, Conservative, Entrepreneur, Growth
  - Devil's Advocates: Contrarian, Disruptor, Pessimist, Realist
  - Philosophy Circle: Existentialist, Rationalist, Skeptic, Utilitarian
  - Roast Panel: Defender, Judge, Savage, Wit
  - Writers' Room: Architect, Dialogue, Psychologist, Worldbuilder

### Default Avatar Fallback
- Added 6 default avatar images (cat, fox, owl, panda, penguin, rabbit) used when a participant has no avatar set.
- Default avatars are assigned by participant index in round-robin order, ensuring visual variety across agents in the same session.
- Fallback applies everywhere avatars appear: session list bubbles, quick-start story cards, active session member panel, and chat message icons.
- New sessions automatically bake the resolved avatar URL into each message, so avatars remain consistent throughout the conversation.
