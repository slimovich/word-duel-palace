/*
 * Client-side dictionary for live "is this a valid word?" feedback only.
 * The server remains authoritative and re-validates every submitted word.
 */

let WORDS = null;
let loading = null;

export function loadDictionary() {
  if (loading) return loading;

  loading = fetch("/api/words")
    .then((r) => r.text())
    .then((txt) => {
      WORDS = new Set(
        txt.split("\n").map((w) => w.trim().toLowerCase()).filter(Boolean)
      );

      return WORDS;
    })
    .catch(() => {
      WORDS = new Set(); // on failure, treat as empty (server still validates)

      return WORDS;
    });

  return loading;
}

export function dictReady() {
  return WORDS !== null;
}

// Returns true/false once loaded, or null while still loading (caller should
// treat "unknown" as "allow" and let the server be the final judge).
export function checkWord(word) {
  if (!WORDS) return null;

  return WORDS.has(String(word).toLowerCase());
}
