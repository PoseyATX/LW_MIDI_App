// Minimal Standard MIDI File (format 0) writer for one-bar step patterns.
// buildMidiBytes is pure (no DOM) so it can be unit-tested from Node;
// exportMidiFile wraps it with a browser download.

const PPQ = 480; // ticks per quarter note
const STEP_TICKS = PPQ / 4; // one sixteenth note

// MIDI delta times are variable-length quantities: 7 bits per byte,
// high bit set on every byte except the last.
function vlq(value) {
  const bytes = [value & 0x7f];
  value >>= 7;
  while (value > 0) {
    bytes.unshift((value & 0x7f) | 0x80);
    value >>= 7;
  }
  return bytes;
}

export function buildMidiBytes(pattern, bpm, { note = 60, velocity = 100 } = {}) {
  // Absolute-tick event list first; deltas are computed in a second pass so
  // rests never emit bytes and gaps of any length encode correctly.
  const events = [];
  pattern.forEach((isHit, i) => {
    if (isHit) {
      events.push({ tick: i * STEP_TICKS, data: [0x90, note, velocity] });
      events.push({ tick: (i + 1) * STEP_TICKS, data: [0x80, note, 0] });
    }
  });
  // Stable sort keeps each note-off ahead of the next note-on at the same tick.
  events.sort((a, b) => a.tick - b.tick);

  const track = [];
  const microsecondsPerQuarter = Math.round(60_000_000 / bpm);
  track.push(
    0x00, 0xff, 0x51, 0x03, // delta 0, Set Tempo meta event
    (microsecondsPerQuarter >> 16) & 0xff,
    (microsecondsPerQuarter >> 8) & 0xff,
    microsecondsPerQuarter & 0xff
  );

  let lastTick = 0;
  for (const ev of events) {
    track.push(...vlq(ev.tick - lastTick), ...ev.data);
    lastTick = ev.tick;
  }

  // End of Track, padded out to the full bar so the exported clip is one measure.
  const endTick = pattern.length * STEP_TICKS;
  track.push(...vlq(Math.max(0, endTick - lastTick)), 0xff, 0x2f, 0x00);

  const header = [
    0x4d, 0x54, 0x68, 0x64, // 'MThd'
    0x00, 0x00, 0x00, 0x06, // header length
    0x00, 0x00, // format 0
    0x00, 0x01, // one track
    (PPQ >> 8) & 0xff, PPQ & 0xff,
  ];
  const trackHeader = [
    0x4d, 0x54, 0x72, 0x6b, // 'MTrk'
    (track.length >>> 24) & 0xff,
    (track.length >> 16) & 0xff,
    (track.length >> 8) & 0xff,
    track.length & 0xff,
  ];

  return new Uint8Array([...header, ...trackHeader, ...track]);
}

export function exportMidiFile(pattern, bpm, filename, options) {
  const bytes = buildMidiBytes(pattern, bpm, options);
  const blob = new Blob([bytes], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.mid`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
