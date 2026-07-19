# Rhythmic Inversion Generator

A web app that takes any 16-step rhythmic pattern and generates its **negative-space inversion** — every hit (`#`) becomes a rest (`_`) and every rest becomes a hit. You can hear both patterns in the browser and export both as standard MIDI files for use in a DAW.

**Live app:** https://poseyatx.github.io/LW_MIDI_App/

Built to the product spec in this repo's project handoff (16-cell grid, pure inversion function, Tone.js playback with BPM control, MIDI export, side-by-side visualization). See also [`ROADMAP.md`](ROADMAP.md) and [`NEXT_STEPS.md`](NEXT_STEPS.md).

---

## Setup / Run

```bash
npm install
npm run dev      # dev server at http://localhost:3000
npm run build    # production build to dist/
npm run preview  # serve the production build locally
```

Node 18+ recommended (matches the CI build). No environment variables, no backend — the app is fully static.

**Deployment** is automatic: pushing to the main development branch runs `.github/workflows/deploy.yml`, which builds the app and publishes `dist/` to the `gh-pages` branch. GitHub Pages (Settings → Pages) is configured to serve `gh-pages` from root.

---

## Architecture

The app is deliberately small: one React component for all UI/state, and two pure utility modules that hold every piece of logic worth testing.

```
User clicks grid ──► pattern: boolean[16]  (React state, single source of truth)
                          │
        ┌─────────────────┼──────────────────────┐
        ▼                 ▼                      ▼
  invertPattern()   Tone.js Transport      buildMidiBytes()
  (pure map over    (schedules synth       (pure: pattern + BPM
   the array)        hits in seconds        → Uint8Array of a
        │            from the array)        format-0 .mid file)
        ▼                                        │
  inverted boolean[16] ──────────────────────────┘
  (derived each render, never stored)
```

Key property: **the inverted pattern is never stored** — it's derived from `pattern` on every render (`invertPattern(pattern)`). That makes desync between original and inverted impossible, which is the spec's core correctness requirement ("matches the grid exactly, cell for cell").

### Key files

| File | Purpose |
|---|---|
| `src/components/RhythmicInversionGenerator.jsx` | All UI and state: grid, BPM slider, playback controls, export buttons. The only stateful module. |
| `src/utils/inversion.js` | Pure functions: `invertPattern` (the core feature) and `patternToString` (`#`/`_` notation). No DOM/audio imports — testable from Node. |
| `src/utils/midiGenerator.js` | `buildMidiBytes(pattern, bpm)` builds a spec-compliant format-0 Standard MIDI File as a `Uint8Array` (pure, Node-testable); `exportMidiFile` wraps it in a browser download. |
| `src/App.jsx`, `src/main.jsx` | Shell and React entry point. |
| `index.html` | Page + all CSS (kept inline for a zero-config single-page tool). |
| `vite.config.js` | Vite + React. `base: './'` is **required** — see design decisions. |
| `.github/workflows/deploy.yml` | Build + deploy to `gh-pages` on push. |

### Playback engine

`playPattern` resets `Tone.Transport` (cancel + position 0), then schedules one callback per step in **musical time** (`0:0:N` bars:beats:sixteenths notation) rather than seconds — this is what lets the BPM slider retime a pattern *while it plays*. Notes trigger on the audio-clock `time` argument for sample-accurate timing; the step highlight uses React state (visually ~50–100 ms lookahead offset, imperceptible at these tempos). Looping uses `Transport.loop` over `[0, '1:0:0')`; the end-of-bar stop callback checks a ref so the loop toggle works live mid-playback (toggling off finishes the current bar cleanly). One pattern plays at a time; the play button of the playing pattern becomes a stop button. Playback pitch follows the same note selector used for MIDI export, so what you hear is what you export.

### MIDI format details

- Format 0, single track, 480 PPQ; one sixteenth note = 120 ticks
- Tempo meta event encodes the BPM slider value at export time
- Each hit = note-on at `step * 120`, note-off at `(step + 1) * 120` (full sixteenth gate)
- Delta times are proper variable-length quantities, so any gap length encodes correctly
- End-of-Track is padded to tick 1920 so the exported clip is exactly one 4/4 bar (drag-and-loop cleanly in a DAW)

---

## Design decisions & judgment calls

These are the places where the spec was ambiguous or I deviated deliberately — flagged per the handoff instructions:

1. **Custom MIDI writer instead of `jsmidgen`.** The spec said "`jsmidgen` or equivalent." jsmidgen (last published ~2015, CommonJS) does not resolve under Vite's ESM bundler — the build failed. Rather than pull in a heavier dependency, I wrote a ~90-line SMF writer. It's covered by a byte-level parser test (see Verification below). If it becomes limiting, swap for `@tonejs/midi` (see `NEXT_STEPS.md`).
2. **Exported note is user-selectable** (dropdown: GM drum-map notes — kick 36, snare 38, hats 42/46 — plus C3/C4/C5), defaulting to C4 (MIDI 60); velocity 100, channel 1. Playback uses the same pitch. The spec says rhythm-only with one note value but doesn't say which; the selector removes the guess.
3. **Inverted grid is read-only.** The spec implies the original is the editable source ("inverted pattern renders live below"). Making both editable would create a two-way sync question the spec doesn't answer.
4. **Playback supports single-pass and loop** via a loop toggle (live, mid-playback). The spec didn't mention looping; it was added as v1.1 polish because groove auditioning is loop-shaped.
5. **BPM is live during playback** — steps are scheduled in musical time, so the transport retimes on slider change. Remaining limitation: *cell edits* mid-playback don't reschedule a running pattern; restart playback to hear pattern changes. (Fix would be migrating to `Tone.Sequence` with a live pattern reference — roadmap material, not MVP.)
6. **`base: './'` in `vite.config.js` is load-bearing.** GitHub Pages serves this app from `/LW_MIDI_App/`, not the domain root. Without a relative base, the built HTML requests `/assets/…` and the page renders empty (this bug shipped once — don't reintroduce it).
7. **All CSS lives in `index.html`.** Fine at this size; move to CSS modules if the component count grows.

## Verification

`src/utils/` is import-safe from Node. The MIDI writer was verified by generating files for edge-case patterns (empty, all 16 hits, single hit in the last cell to force multi-byte deltas, four-on-the-floor at an odd BPM, and an inverted pattern) and walking the raw bytes with an independent SMF parser: header, PPQ, tempo encoding, every note-on/off tick, End-of-Track position, and declared-vs-actual track length. Inversion is verified as a self-inverse that flips every cell. Manual DAW import remains on you — see `NEXT_STEPS.md` for the checklist.
