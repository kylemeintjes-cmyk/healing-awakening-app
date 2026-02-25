# Human OS Training Pipeline

This folder contains training assets to build a broader, practical Human OS model focused on:

- wellbeing and nervous-system regulation
- life satisfaction and personal joy
- clarity, execution, and goal achievement
- income confidence and practical action

## Workflow

1. Put your source material into:
- `training/human_os/sources/books/`
- `training/human_os/sources/transcripts/`

Supported source formats:
- `.txt`
- `.md`
- `.json`
- `.jsonl`

2. Build retrieval/knowledge chunks:

```bash
npm run human:knowledge:build
```

Output:
- `training/human_os/knowledge.chunks.jsonl`
- `training/human_os/knowledge.report.json`

3. Build fine-tuning dataset:

```bash
npm run human:sft:build
```

Optional: include chunk text in generated SFT prompts:

```bash
$env:HUMAN_SFT_INCLUDE_SOURCE_TEXT='true'; npm run human:sft:build
```

Output:
- `training/human-os-sft.jsonl`
- `training/human-os-sft.report.json`

4. Start OpenAI fine-tuning job:

```bash
$env:OPENAI_API_KEY='your_key'
npm run human:ft:start -- --model your_base_model_id
```

Optional:
- `--training-file path/to/file.jsonl`
- `--validation-file path/to/validation.jsonl`
- `--suffix human-os-v1`

5. Check fine-tune status:

```bash
$env:OPENAI_API_KEY='your_key'
npm run human:ft:status
```

Or with explicit job id:

```bash
npm run human:ft:status -- --job-id ftjob_xxx
```

## Files

- `wellbeing_factors.json`: factor ontology for wellbeing/action systems.
- `examples.manual.jsonl`: curated high-quality instruction examples.
- `schema.json`: JSON schema for row shape.
- `eval.prompts.jsonl`: benchmark prompts to evaluate model quality.

## Legal and data notes

- Only include source materials you have rights to use for this purpose.
- Avoid private/identifying personal data in training files.
- Favor distilled summaries over verbatim copyrighted content when possible.
