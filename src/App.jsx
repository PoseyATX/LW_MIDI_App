import RhythmicInversionGenerator from './components/RhythmicInversionGenerator';

export default function App() {
  return (
    <div className="container">
      <h1>🎵 Rhythmic Inversion Generator</h1>
      <p className="subtitle">Create and invert rhythmic patterns with MIDI export</p>
      <RhythmicInversionGenerator />
    </div>
  );
}
