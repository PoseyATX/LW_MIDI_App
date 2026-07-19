# Rhythmic Inversion Generator

A web app for creating and inverting rhythmic patterns with MIDI export capabilities.

## Features

- **16-Cell Grid UI**: Click to toggle sixteenth-note cells ON (#) or OFF (_)
- **Pattern Inversion**: Automatically flip patterns (all # become _, all _ become #)
- **Audio Playback**: Play original and inverted patterns with adjustable tempo
- **MIDI Export**: Export patterns as standard .mid files compatible with any DAW
- **Real-time Visualization**: See patterns as text and interactive grids
- **Side-by-Side Comparison**: Compare original and inverted patterns simultaneously

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Opens the app at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

## Usage

1. **Create a Pattern**: Click grid cells to toggle notes ON (#) or OFF (_)
2. **Invert Pattern**: Click "🔄 Invert Pattern" to flip all cells
3. **Adjust Tempo**: Use the BPM slider (40-240 BPM)
4. **Play**: Click "▶ Play" to hear either pattern with a simple triangle wave synth
5. **Export**: Click "💾 Export MIDI" to download patterns as .mid files
6. **Clear**: Click "🗑 Clear" to reset the pattern

## Technologies

- **React 18**: UI framework
- **Tone.js**: Web audio synthesis and playback
- **jsmidgen**: MIDI file generation
- **Vite**: Build tool and dev server

## Features Breakdown

### Grid UI
- 16 clickable cells (4x4 grid)
- Visual feedback with hover and active states
- Each cell represents one sixteenth note at the current tempo

### Inversion Logic
- Simple boolean flip: `inverted = !original`
- Displayed side-by-side for comparison
- Read-only grid for inverted pattern (source of truth is original)

### Audio Playback
- Tone.js synth with triangle oscillator
- Fast attack/release for percussive sound
- Tempo-aware scheduling using Tone.Transport
- Real-time step visualization during playback

### MIDI Export
- Creates standard MIDI files using jsmidgen
- Note velocity: 100
- Note pitch: C4 (Middle C, MIDI note 60)
- Timing based on current BPM setting
- Individual export buttons for each pattern
- Bulk export option for both patterns

## Architecture

```
src/
├── main.jsx                          # React entry point
├── App.jsx                           # App wrapper
└── components/
    └── RhythmicInversionGenerator.jsx # Main component (all logic)
```

## Future Enhancements

- Multiple instrument selection
- Scale/note mode (custom pitches)
- Pattern library/presets
- Recording/drawing patterns with mouse
- Swing/groove templates
- Visual piano roll display
- Polyrhythmic patterns
