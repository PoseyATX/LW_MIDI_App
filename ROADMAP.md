# Roadmap

Current state: MVP complete per spec — 16-cell grid, deterministic inversion, Tone.js playback with BPM control, DAW-compatible MIDI export for both patterns, side-by-side grid + text visualization. Deployed to GitHub Pages.

Sequencing principle: ship the things that deepen the core loop (build → hear → export) before the things that widen it (more voices, more formats). Each phase is independently shippable.

## Phase 1 — Polish the core loop (v1.1)

Small items with outsized daily-use value; all are afternoon-sized.

1. **Loop playback toggle.** Musicians audition grooves in loops, not single passes. Highest value-to-effort ratio in the backlog. (Tone.js `Transport.loop` makes this trivial.)
2. **Live BPM during playback.** Schedule steps in transport-relative time (`bars:beats:sixteenths`) instead of seconds, so the BPM slider retimes a playing pattern. Pays down the known tech debt in `playPattern`.
3. **Pattern presets + URL sharing.** Encode the 16 cells as 4 hex chars in the URL hash (e.g. `#8888` = four-on-the-floor). Makes patterns shareable with the roommate — the actual target user — for free, no backend.
4. **Beat grouping visuals.** Heavier border every 4 cells so beats 1/2/3/4 are readable at a glance.

## Phase 2 — Wider patterns (v1.2)

5. **Adjustable grid resolution (8/16/32).** First open question in the spec. The state model already supports any length; work is UI + one constant → parameter in the MIDI writer and scheduler. Do this *before* MIDI import so imports have somewhere to land besides 16 slots.
6. **Choice of exported note/channel** (C4 vs. C1-for-drum-racks vs. GM channel 10). One dropdown; removes the most likely DAW-workflow friction.
7. **Velocity per cell** (off / soft / accent). Stays within "rhythm only" but makes exports musical. This is the natural point to migrate the cell state from `boolean[]` to `int[]` — do it here, before multi-voice multiplies the cost of the migration.

## Phase 3 — MIDI import (v2)

8. **Drag-a-`.mid`-in, get its inversion out.** The spec's flagged fast-follow and the biggest unlock: inverting *real recorded grooves* rather than hand-built ones. Requires a parser (use `@tonejs/midi` — do not hand-roll parsing; writing SMF is simple, reading arbitrary DAW output is not) plus a quantize-to-grid step. Depends on Phase 2's resolution work (imports won't all be 16 sixteenths).

## Phase 4 — Multi-voice (v2+)

9. **2–4 lanes (e.g. kick/snare/hat), per-lane inversion, multi-track export.** The spec's v2 milestone. Touches every layer (state, UI, playback, export), which is exactly why it's sequenced last — everything before it makes this cheaper (velocity migration, resolution parameter, `@tonejs/midi` already in the tree).

## Tech debt / shortcuts to revisit

- **Seconds-based scheduling** — fixed by Phase 1 item 2.
- **Custom MIDI writer** — correct and parser-tested for what it does, but it's bespoke code; when `@tonejs/midi` arrives for import (Phase 3), consider using it for export too and deleting `midiGenerator.js`.
- **No test runner in the repo.** Verification currently lives in a standalone Node script exercising the pure utils. Add Vitest and land those tests as `src/utils/*.test.js` the next time anyone touches the utils.
- **All CSS in `index.html`** — fine now; split into modules when multi-voice UI lands.
- **Deploy workflow triggers on the feature branch** (`claude/rhythmic-inversion-generator-1560wv`). When this merges to a default branch, update the branch filter in `.github/workflows/deploy.yml` or deploys will silently stop.
