/**
 * Clean up key signature strings from the backend.
 * music21 sometimes returns strings like "<music21.key.KeySignature of 1 flat>"
 * or "f minor". This normalizes them to friendly names like "F Minor".
 */
export function cleanKeySignature(raw?: string | null): string | null {
  if (!raw) return null;

  let cleaned = raw.trim();

  // Strip music21 repr wrappers: <music21.key.KeySignature of ...>
  const reprMatch = cleaned.match(/<music21[^>]*?of\s+(.+?)>/i);
  if (reprMatch) {
    const inner = reprMatch[1].trim();
    // e.g. "1 flat", "3 sharps" — can't derive key name, return as-is
    return inner.charAt(0).toUpperCase() + inner.slice(1);
  }

  // Strip any remaining angle brackets
  cleaned = cleaned.replace(/<[^>]*>/g, "").trim();

  if (!cleaned) return null;

  // Capitalize first letter of each word: "f major" → "F Major"
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}
