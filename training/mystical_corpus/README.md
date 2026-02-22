# Mystical Corpus

This folder stores curated training examples for oracle behavior.

## Files

- `schema.json`: validation reference for each corpus row.
- `examples.jsonl`: handcrafted high-quality examples.
- `astrology_sign_profiles.jsonl`: sign-specific astrology gifts/purpose examples (12 signs).

## Row Format

Each line in `examples.jsonl` is one JSON object:

```json
{
  "id": "gift-001",
  "tradition": "astrology",
  "topic": "gifts",
  "tone": "mystic",
  "source": "curated_internal",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "tags": ["gift_discovery", "clarifying_question", "safe_language"]
}
```

## Curation Rules

- Keep assistant outputs structured, concise, and specific.
- Include follow-up questions when astrology data is missing.
- Avoid deterministic prophecy and medical certainty.
- Prefer actionability over abstraction.
