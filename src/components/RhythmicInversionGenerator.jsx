import React, { useState, useRef, useEffect } from 'react';
import * as Tone from 'tone';
import { generateMidiFile } from '../utils/midiGenerator';

const GRID_SIZE = 16;

export default function RhythmicInversionGenerator() {
  const [pattern, setPattern] = useState(Array(GRID_SIZE).fill(false));
  const [bpm, setBpm] = useState(120);
  const [playing, setPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const synth = useRef(null);
  const nowRef = useRef(null);

  useEffect(() => {
    const initSynth = async () => {
      await Tone.start();
      synth.current = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: {
          attack: 0.005,
          decay: 0.1,
          sustain: 0,
          release: 0.05,
        },
      }).toDestination();
    };
    initSynth();
  }, []);

  const toggleCell = (index) => {
    const newPattern = [...pattern];
    newPattern[index] = !newPattern[index];
    setPattern(newPattern);
  };

  const invertPattern = () => {
    const inverted = pattern.map(cell => !cell);
    setPattern(inverted);
  };

  const clearPattern = () => {
    setPattern(Array(GRID_SIZE).fill(false));
    setPlaying(false);
    setCurrentStep(-1);
  };

  const patternToString = (pat) => {
    return pat.map(cell => (cell ? '#' : '_')).join('');
  };

  const getInvertedPattern = () => {
    return pattern.map(cell => !cell);
  };

  const playPattern = async (patternToPlay) => {
    if (playing) {
      Tone.Transport.stop();
      Tone.Transport.cancel();
      setPlaying(false);
      setCurrentStep(-1);
      return;
    }

    await Tone.start();
    setPlaying(true);

    const sixteenthDuration = (60 / bpm) * 0.25;
    Tone.Transport.bpm.value = bpm;

    patternToPlay.forEach((isActive, index) => {
      Tone.Transport.schedule(() => {
        setCurrentStep(index);
      }, index * sixteenthDuration);

      if (isActive) {
        const time = index * sixteenthDuration;
        Tone.Transport.schedule(() => {
          if (synth.current) {
            synth.current.triggerAttackRelease('C4', '16n');
          }
        }, time);
      }
    });

    Tone.Transport.schedule(() => {
      setPlaying(false);
      setCurrentStep(-1);
    }, GRID_SIZE * sixteenthDuration);

    Tone.Transport.start();
  };

  const exportMidi = (patternToExport, filename) => {
    generateMidiFile(patternToExport, bpm, filename);
  };

  const inverted = getInvertedPattern();
  const originalString = patternToString(pattern);
  const invertedString = patternToString(inverted);

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
            onChange={(e) => setBpm(parseInt(e.target.value))}
          />
          <div className="bpm-value">{bpm}</div>
        </div>

        <div className="control-group button-group">
          <button className="btn-primary" onClick={() => playPattern(pattern)}>
            {playing ? '⏸ Stop Original' : '▶ Play Original'}
          </button>
          <button className="btn-primary" onClick={() => playPattern(inverted)}>
            {playing ? '⏸ Stop Inverted' : '▶ Play Inverted'}
          </button>
        </div>

        <div className="control-group button-group">
          <button className="btn-secondary" onClick={invertPattern}>
            🔄 Invert Pattern
          </button>
          <button className="btn-danger" onClick={clearPattern}>
            🗑 Clear
          </button>
        </div>
      </div>

      {playing && <div className="status playing">▶ Now Playing...</div>}

      <div className="patterns-wrapper">
        <div className="pattern-section">
          <div className="pattern-title">
            Original Pattern
            <span className="pattern-badge badge-original">Edit</span>
          </div>

          <div className="grid">
            {pattern.map((isActive, index) => (
              <div
                key={index}
                className={`cell ${isActive ? 'active' : ''} ${
                  currentStep === index && playing ? 'active' : ''
                }`}
                onClick={() => toggleCell(index)}
                style={{
                  opacity: currentStep === index && playing ? 1 : 0.9,
                }}
              >
                {isActive ? '#' : '_'}
              </div>
            ))}
          </div>

          <div className="pattern-text">{originalString}</div>

          <div className="playback-controls">
            <button className="btn-primary" onClick={() => playPattern(pattern)}>
              {playing ? '⏸ Stop' : '▶ Play'}
            </button>
            <button
              className="btn-success"
              onClick={() => exportMidi(pattern, 'original-pattern')}
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

          <div className="grid">
            {inverted.map((isActive, index) => (
              <div
                key={index}
                className={`cell ${isActive ? 'inverted' : ''} ${
                  currentStep === index && playing ? 'inverted' : ''
                }`}
                style={{
                  opacity: currentStep === index && playing ? 1 : 0.9,
                  cursor: 'default',
                }}
              >
                {isActive ? '#' : '_'}
              </div>
            ))}
          </div>

          <div className="pattern-text">{invertedString}</div>

          <div className="playback-controls">
            <button className="btn-primary" onClick={() => playPattern(inverted)}>
              {playing ? '⏸ Stop' : '▶ Play'}
            </button>
            <button
              className="btn-success"
              onClick={() => exportMidi(inverted, 'inverted-pattern')}
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
            exportMidi(pattern, 'original-pattern');
            setTimeout(() => exportMidi(inverted, 'inverted-pattern'), 500);
          }}
        >
          💾 Export All
        </button>
      </div>
    </div>
  );
}
