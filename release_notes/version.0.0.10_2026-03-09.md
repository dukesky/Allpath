# AllPath v0.0.10 (2026-03-09)

## What changed

- Added four new default agents to the Journey to the West group:
  - Zhu Bajie (猪八戒)
  - Sha Wujing (沙悟净)
  - Huangmei Dawang (黄眉大王)
  - Erlang Shen (二郎神)
- Added local avatar assets for the new Journey to the West agents in `public/avatars/`:
  - `zhu-ba-jie.png`
  - `sha-wu-jing.png`
  - `huang-mei-da-wang.png`
  - `er-lang-shen.png`
- Updated default profile mappings in `lib/agentProfiles.ts` to use the new PNG avatars.
- Updated project docs to include the production domain:
  - `https://all-path.com`

## Notes

- Existing user-customized profiles in local storage are preserved.
- New defaults are auto-added when missing from local profile library.
