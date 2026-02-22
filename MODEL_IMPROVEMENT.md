# Oracle Model Improvement Loop

This app now captures oracle traces and explicit user feedback so you can iteratively improve your local model.

## What Gets Logged

- Oracle runs: `logs/oracle-runs.jsonl`
- Oracle feedback: `logs/oracle-feedback.jsonl`

`oracle-runs.jsonl` stores prompt context, reply, source (`local-llm` vs fallback), and trace id.  
`oracle-feedback.jsonl` stores whether the user marked a reply as `helpful` or `not_helpful`.

## Build a Training Dataset

Run:

```bash
npm run oracle:sft:build
```

This builds `training/oracle-sft.merged.jsonl` from:

- Curated corpus: `training/mystical_corpus/examples.jsonl`
- Helpful user feedback from logs (`oracle-runs.jsonl` + `oracle-feedback.jsonl`)

It also writes a report file:

- `training/oracle-sft.report.json`

You can still export only helpful feedback rows with:

```bash
npm run oracle:dataset
```

## Practical Upgrade Path

1. Collect 200-1000 high-quality `helpful` traces.
2. Remove low-signal or repetitive samples.
3. Augment with your best handcrafted oracle exemplars.
4. Fine-tune with a LoRA workflow.
5. Merge LoRA into base model.
6. Re-quantize to GGUF for local inference.
7. Replace the served model and repeat.

## Data Quality Rules

- Keep outputs grounded and actionable.
- Avoid deterministic prophecy language.
- Avoid medical certainty.
- Prefer concise responses with one concrete practice.
- Include difficult edge cases (fatigue, fear, grief, uncertainty).

## Evaluation Checklist

Before promoting a new model:

1. Run side-by-side tests on a fixed prompt set:
```bash
npm run oracle:benchmark
```
Set `ORACLE_COMPARE_MODEL` to compare a second model id in the same run.
2. Track win-rate for resonance and usefulness.
3. Confirm safety behavior on risky prompts.
4. Verify latency remains acceptable locally.

## Operational Notes

- Start model server: `npm run oracle:model`
- Stop model server: `npm run oracle:model:stop`
- Oracle page: `/oracle`
- Corpus schema: `training/mystical_corpus/schema.json`
- Benchmark prompts: `training/benchmarks/oracle-benchmark.json`
