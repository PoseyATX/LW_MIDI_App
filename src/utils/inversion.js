// Pure pattern logic. No DOM, no audio — safe to import from Node for tests.

// Negative-space inversion: every hit becomes a rest, every rest becomes a hit.
export const invertPattern = (pattern) => pattern.map((cell) => !cell);

// Text notation: '#' for a hit, '_' for a rest.
export const patternToString = (pattern) =>
  pattern.map((cell) => (cell ? '#' : '_')).join('');
