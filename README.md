# Healing Awakening App

Next.js app for guided healing workflows with a local mystical AI oracle.

## Getting Started

Run the dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Local GGUF Oracle Setup

1. Start your local model server with an OpenAI-compatible API.

Example (`llama.cpp`):

```bash
llama-server -m C:\path\to\your-model.gguf --host 127.0.0.1 --port 1234 -c 4096
```

2. Add these values to `.env.local`:

- `LOCAL_LLM_BASE_URL` (example: `http://127.0.0.1:1234/v1`)
- `LOCAL_LLM_MODEL` (your loaded model id/name)
- `LOCAL_LLM_TIMEOUT_MS` (example: `45000`)

3. `POST /api/oracle` uses the local model for final oracle synthesis.

4. If the local model server is unavailable, the route falls back to deterministic guidance text.

## Oracle UX

- Home now includes an embedded oracle panel.
- Full oracle interface is available at `/oracle`.
- Oracle health endpoint: `/api/oracle/health`.
- Oracle feedback endpoint: `/api/oracle/feedback`.

## Model Ops

- Start model: `npm run oracle:model`
- Stop model: `npm run oracle:model:stop`
- Export SFT dataset from feedback: `npm run oracle:dataset`
- Build merged SFT dataset (corpus + feedback): `npm run oracle:sft:build`
- Run benchmark suite: `npm run oracle:benchmark`
- Improvement guide: `MODEL_IMPROVEMENT.md`

## Human OS Training Ops

- Build knowledge chunks from books/transcripts: `npm run human:knowledge:build`
- Build Human OS SFT dataset: `npm run human:sft:build`
- Start OpenAI fine-tune job: `npm run human:ft:start -- --model <base_model_id>`
- Check fine-tune status: `npm run human:ft:status`
- Enable fine-tuned daily guidance in `/api/human/checkin` by setting:
  - `OPENAI_API_KEY`
  - `HUMAN_FT_MODEL` (example: `ft:gpt-3.5-turbo-0125:...`)
  - Optional timeout override: `HUMAN_MODEL_TIMEOUT_MS` (default `18000`)
- Training docs and source folders: `training/human_os/README.md`

## Notes

- Keep model calls server-side only.
- Keep tarot/astrology/text retrieval deterministic and use the local model mainly for synthesis + voice.
