// Minimal MIDI file generator for simple drum patterns
// Creates a valid MIDI file with note-on/note-off events

export function generateMidiFile(pattern, bpm, filename) {
  const noteValue = 60; // Middle C
  const velocity = 100;

  // MIDI file structure
  const header = [
    // MThd header
    0x4d, 0x54, 0x68, 0x64, // 'MThd'
    0x00, 0x00, 0x00, 0x06, // Header length (6 bytes)
    0x00, 0x00, // Format type 0
    0x00, 0x01, // Number of tracks
    0x00, 0xf0, // Division (240 ticks per quarter note)
  ];

  // Build track data
  let trackData = [];

  // Set tempo: 3 bytes for tempo in microseconds per quarter note
  const microsecondsPerQuarter = Math.round(60000000 / bpm);
  trackData = trackData.concat([
    0x00, // Delta time
    0xff, 0x51, 0x03, // Meta event: Set Tempo
    (microsecondsPerQuarter >> 16) & 0xff,
    (microsecondsPerQuarter >> 8) & 0xff,
    microsecondsPerQuarter & 0xff,
  ]);

  // Add notes for each step
  // Each sixteenth note = 60 ticks (240 / 4)
  const sixteenthTicks = 60;

  pattern.forEach((isActive, index) => {
    // Delta time from previous event (240 ticks = 60 per sixteenth = one sixteenth note)
    if (index === 0) {
      trackData.push(0x00); // No delay for first note
    } else {
      trackData.push(sixteenthTicks & 0x7f);
    }

    if (isActive) {
      // Note On event
      trackData = trackData.concat([0x90, noteValue, velocity]);

      // Delta time for note duration
      trackData.push(sixteenthTicks & 0x7f);

      // Note Off event
      trackData = trackData.concat([0x80, noteValue, velocity]);
    }
  });

  // Add track end meta event
  trackData = trackData.concat([0x00, 0xff, 0x2f, 0x00]);

  // Build MTrk header
  const trackHeader = [0x4d, 0x54, 0x72, 0x6b]; // 'MTrk'

  // Convert trackData to Uint8Array for length calculation
  const trackDataBytes = new Uint8Array(trackData);
  const trackLength = trackDataBytes.length;

  const trackLengthBytes = [
    (trackLength >> 24) & 0xff,
    (trackLength >> 16) & 0xff,
    (trackLength >> 8) & 0xff,
    trackLength & 0xff,
  ];

  // Combine all parts
  const midiFile = new Uint8Array([
    ...header,
    ...trackHeader,
    ...trackLengthBytes,
    ...trackData,
  ]);

  // Create download link
  const blob = new Blob([midiFile], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.mid`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
