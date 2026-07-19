# Practical Next Steps

Concrete actions to take this from working prototype to something you trust and share. Ordered: verify first, then harden, then distribute.

## 1. Manual checks before trusting the MIDI export

The byte-level structure is machine-verified (see README → Verification), but "opens and plays correctly in a standard DAW" — the spec's success criterion — needs a human pass:

- [ ] Export the **four-on-the-floor** preset pattern (`#___#___#___#___`) and its inversion; drag both into Ableton/Logic.
- [ ] Confirm the clip length is exactly **1 bar** and loops cleanly with no trailing silence or truncation.
- [ ] Confirm the DAW reads the **embedded tempo** (import at a project tempo different from the export BPM and check which wins — DAWs differ; know your DAW's behavior).
- [ ] Confirm hits land on the grid lines in the DAW's piano roll (no off-grid drift), and note length is one sixteenth.
- [ ] Change the note selector (e.g. C1 · 36 — Kick) before exporting and confirm the hits land on that key — especially onto an Ableton Drum Rack pad.
- [ ] Export at extreme BPMs (40 and 240) and confirm both import sanely.
- [ ] Edge cases: empty pattern (should import as one empty bar) and all-16-hits.
- [ ] A/B test: play the pattern in-browser, then in the DAW at the same BPM — they should be rhythmically identical.

## 2. Cross-browser audio/MIDI consistency

If playback or export misbehaves on some machine:

- **No sound at all** → almost always autoplay policy. Audio can only start from a user gesture; the app calls `Tone.start()` inside the play-button handler for this reason. If it regresses, check that path first — don't move `Tone.start()` to mount.
- **First note clipped or late** → the AudioContext was just resumed. Acceptable at MVP; the fix is starting the transport ~50 ms in the future (`Tone.Transport.start('+0.05')`).
- **Sound dies after tab sleep** (esp. iOS Safari) → context suspended; a fresh play click re-awaits `Tone.start()`, which resumes it.
- **Export downloads nothing** → the download uses a Blob + anchor click, which every modern browser supports; check for popup/download blockers before suspecting the code. The `.mid` bytes themselves are browser-independent — never debug byte content per-browser.
- Realistic test matrix for this project: Chrome + Firefox + Safari desktop, Safari iOS. Tone.js v14 covers all of them.

## 3. Deployment

- **Current:** GitHub Pages via Actions — push to the dev branch → build → publish `dist/` to `gh-pages`. Live at https://poseyatx.github.io/LW_MIDI_App/. Zero cost, fine for this project's audience of two.
- If the repo is renamed or moved to a custom domain, revisit `base: './'` in `vite.config.js` and re-check the Pages settings — the empty-page-with-mauve-background failure mode means asset paths broke.
- Alternatives only if you outgrow Pages (preview deploys per PR, custom domain with zero config): Netlify or Vercel, both of which auto-detect Vite. No server-side anything is needed — keep it static.

## 4. If the MIDI library proves limiting

The app currently uses a **custom ~90-line SMF writer** (`src/utils/midiGenerator.js`) because `jsmidgen` (spec's suggestion) is a 2015-era CommonJS package that fails to bundle under Vite. Decision rule for the future:

- **Keep the custom writer while** the export is one track, one note value, fixed velocity — it's tested, dependency-free, and readable.
- **Swap to [`@tonejs/midi`](https://github.com/Tonejs/Midi) when** you need any of: MIDI *import* (Phase 3 of the roadmap — never hand-roll a parser), multi-track export (multi-voice), per-note velocity/length control beyond the current scheme, or format-1 files. It's actively maintained, ESM-friendly, and pairs naturally with the existing Tone.js dependency. `midi-writer-js` is a reasonable export-only alternative, but standardizing on one library for both directions is simpler.
- Migration cost is low by design: everything funnels through `buildMidiBytes(pattern, bpm)` — reimplement that one function against the new library and delete the rest of the file.

## 5. Housekeeping worth doing soon

- Add **Vitest** and land the pure-util tests (inversion + MIDI byte parsing) in-repo as `src/utils/*.test.js`, wired into CI before the deploy step, so a broken export can never ship.
- Update the **deploy workflow's branch filter** when this merges to a default branch (see ROADMAP tech-debt note).
- Add a **preset row** (four-on-the-floor, backbeat, clave) — cheap, and makes the first-open experience self-explanatory for anyone you share the link with.
