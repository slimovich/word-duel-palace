"""Game rules — the word dictionary.

Owns the authoritative word set plus two derived structures: a newline-joined
text blob (served to clients for live previews) and an anagram index used by the
bot to find playable words quickly.
"""

from __future__ import annotations


class Dictionary:
    def __init__(self, words: set[str]) -> None:
        self._words = words
        self._text = "\n".join(sorted(words))
        # sorted-letters -> a representative valid word
        self._anagrams: dict[str, str] = {}

        for w in words:
            self._anagrams.setdefault("".join(sorted(w)), w)

    @classmethod
    def load(cls, path: str) -> "Dictionary":
        with open(path, encoding="utf-8") as f:
            return cls({line.strip() for line in f if line.strip()})

    def __contains__(self, word: str) -> bool:
        return word in self._words

    def __len__(self) -> int:
        return len(self._words)

    @property
    def text(self) -> str:
        return self._text

    @property
    def anagram_count(self) -> int:
        return len(self._anagrams)

    def anagram(self, sorted_key: str) -> str | None:
        """Return a valid word whose letters sort to `sorted_key`, if any."""

        return self._anagrams.get(sorted_key)
