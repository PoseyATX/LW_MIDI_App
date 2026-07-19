import { useState, useRef, useEffect } from 'react';
import * as Tone from 'tone';
import { invertPattern, patternToString } from '../utils/inversion';
import { exportMidiFile } from '../utils/midiGenerator';

const GRID_SIZE = 16;

// Common targets: General MIDI drum-map notes for DAW drum racks, plus plain C's.
const NOTE_OPTIONS = [
  { midi: 36, label: 'C1 · 36 — Kick (GM drums)' },
  { midi: 38, label: 'D1 · 38 — Snare (GM drums)' },
  { midi: 42, label: 'F#1 · 42 — Closed Hat (GM drums)' },
  { midi: 46, label: 'A#1 · 46 — Open Hat (GM drums)' },
  { midi: 48, label: 'C3 · 48' },
  { midi: 60, label: 'C4 · 60 — Middle C' },
  { midi: 72, label: 'C5 · 72' },
];

export default function RhythmicInversionGenerator() {
  const [pattern, setPattern] = useState(() => Array(GRID_SIZE).fill(false));
  const [bpm, setBpm] = useState(120);
  const [exportNote, setExportNote] = useState(60);
  const [loopEnabled, setLoopEnabled] = useState(false);
  // Which pattern is audible right now: 'original', 'inverted', or null.
  const [playingVoice, setPlayingVoice] = useState(null);
  const [currentStep, setCurrentStep] = useState(-1);
  const synth = useRef(null);
  const loopRef = useRef(loopEnabled);

  useEffect(() => {
    // Creating a synth doesn't need a running AudioContext; Tone.start()
    // happens on the first play click to satisfy browser autoplay policies.
    synth.current = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.05 },
    }).toDestination();
    return () => {
      Tone.Transport.stop();
      Tone.Transport.cancel();
      Tone.Transport.loop = false;
      synth.current?.dispose();
    };
  }, []);

  // Steps are scheduled in musical time (bars:beats:sixteenths), so updating
  // the transport BPM retimes a playing pattern live.
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  // Loop can be toggled mid-playback; the end-of-bar callback consults
  // loopRef so a live toggle-off still stops cleanly at the bar line.
  useEffect(() => {
    loopRef.current = loopEnabled;
    Tone.Transport.loop = loopEnabled;
  }, [loopEnabled]);

  const inverted = invertPattern(pattern);

  const toggleCell = (index) => {
    setPattern((prev) => prev.map((cell, i) => (i === index ? !cell : cell)));
  };

  const stopPlayback = () => {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    Tone.Transport.loop = false;
    setPlayingVoice(null);
    setCurrentStep(-1);
  };

  const clearPattern = () => {
    stopPlayback();
    setPattern(Array(GRID_SIZE).fill(false));
  };

  const playPattern = async (patternToPlay, voice) => {
    const wasPlaying = playingVoice;
    if (wasPlaying) {
      stopPlayback();
      if (wasPlaying === voice) return; // same button acts as stop
    }

    await Tone.start();
    // Reset the transport so scheduling always starts from position zero —
    // without this, a second play would schedule events in the past.
    Tone.Transport.cancel();
    Tone.Transport.position = 0;
    Tone.Transport.bpm.value = bpm;
    Tone.Transport.loop = loopEnabled;
    Tone.Transport.loopStart = 0;
    Tone.Transport.loopEnd = '1:0:0';

    const pitch = Tone.Frequency(exportNote, 'midi').toNote();

    patternToPlay.forEach((isActive, index) => {
      Tone.Transport.schedule((time) => {
        setCurrentStep(index);
        if (isActive) {
          synth.current?.triggerAttackRelease(pitch, '16n', time);
        }
      }, `0:0:${index}`);
    });

    // When looping, the transport wraps just before '1:0:0' and this never
    // fires; when the loop is off (or toggled off mid-play), it stops here.
    Tone.Transport.schedule(() => {
      if (loopRef.current) return;
      Tone.Transport.stop();
      Tone.Transport.cancel();
      setPlayingVoice(null);
      setCurrentStep(-1);
    }, '1:0:0');

    setPlayingVoice(voice);
    Tone.Transport.start();
  };

  const renderGrid = (cells, voice, activeClass, editable) => (
    <div className="grid">
      {cells.map((isActive, index) => (
        <div
          key={index}
          className={[
            'cell',
            isActive ? activeClass : '',
            playingVoice === voice && currentStep === index ? 'playing-step' : '',
          ].join(' ')}
          onClick={editable ? () => toggleCell(index) : undefined}
          style={editable ? undefined : { cursor: 'default' }}
        >
          {isActive ? '#' : '_'}
        </div>
      ))}
    </div>
  );

  const playLabel = (voice, label) =>
    playingVoice === voice ? '⏹ Stop' : `▶ ${label}`;

  return (
    <div>
      <div className="controls">
        <div className="control-group">
          <label>Tempo (BPM)</label>
          <input
            type="range"
            min="40"
            max="240"
            value={bpm}
            onChange={(e) => setBpm(parseInt(e.target.value, 10))}
          />
          <div className="bpm-value">{bpm}</div>
        </div>

        <div className="control-group">
          <label>Note (playback &amp; MIDI export)</label>
          <select
            value={exportNote}
            onChange={(e) => setExportNote(parseInt(e.target.value, 10))}
          >
            {NOTE_OPTIONS.map((opt) => (
              <option key={opt.midi} value={opt.midi}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group button-group">
          <button className="btn-primary" onClick={() => playPattern(pattern, 'original')}>
            {playLabel('original', 'Play Original')}
          </button>
          <button className="btn-primary" onClick={() => playPattern(inverted, 'inverted')}>
            {playLabel('inverted', 'Play Inverted')}
          </button>
        </div>

        <div className="control-group button-group">
          <button
            className={loopEnabled ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setLoopEnabled((v) => !v)}
          >
            {loopEnabled ? '🔁 Loop: On' : '🔁 Loop: Off'}
          </button>
          <button className="btn-danger" onClick={clearPattern}>
            🗑 Clear
          </button>
        </div>
      </div>

      {playingVoice && (
        <div className="status playing">
          ▶ Playing {playingVoice} pattern{loopEnabled ? ' (looping)' : ''}…
        </div>
      )}

      <div className="patterns-wrapper">
        <div className="pattern-section">
          <div className="pattern-title">
            Original Pattern
            <span className="pattern-badge badge-original">Edit</span>
          </div>

          {renderGrid(pattern, 'original', 'active', true)}

          <div className="pattern-text">{patternToString(pattern)}</div>

          <div className="playback-controls">
            <button className="btn-primary" onClick={() => playPattern(pattern, 'original')}>
              {playLabel('original', 'Play')}
            </button>
            <button
              className="btn-success"
              onClick={() => exportMidiFile(pattern, bpm, 'original-pattern', { note: exportNote })}
            >
              💾 Export MIDI
            </button>
          </div>
        </div>

        <div className="pattern-section">
          <div className="pattern-title">
            Inverted Pattern
            <span className="pattern-badge badge-inverted">Generated</span>
          </div>

          {renderGrid(inverted, 'inverted', 'inverted', false)}

          <div className="pattern-text">{patternToString(inverted)}</div>

          <div className="playback-controls">
            <button className="btn-primary" onClick={() => playPattern(inverted, 'inverted')}>
              {playLabel('inverted', 'Play')}
            </button>
            <button
              className="btn-success"
              onClick={() => exportMidiFile(inverted, bpm, 'inverted-pattern', { note: exportNote })}
            >
              💾 Export MIDI
            </button>
          </div>
        </div>
      </div>

      <div className="export-section">
        <span className="export-label">📥 Export Both Patterns:</span>
        <button
          className="btn-success"
          onClick={() => {
            exportMidiFile(pattern, bpm, 'original-pattern', { note: exportNote });
            setTimeout(
              () => exportMidiFile(inverted, bpm, 'inverted-pattern', { note: exportNote }),
              500
            );
          }}
        >
          💾 Export All
        </button>
      </div>
    </div>
  );
}
