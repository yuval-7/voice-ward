# Voice Ward

Voice Ward is a voice-native incident desk for hands-busy operators. Its hard voice problem is **interruption and recovery**: the user can barge in while a response is pending or playing, and stale audio/results cannot re-enter the conversation.

## Run

1. Copy `.env.example` to `.env` and add `RIME_API_KEY`.
2. `npm start`
3. Open `http://localhost:3000`.
4. Before recording the demo, run `npm run preflight`.

No key is required to explore the interaction: the UI marks the local browser TTS path as **Local development fallback**. In a judged flow, configure a Rime key: the server calls `POST /v1/rime-tts`, requests MP3, and labels **Rime** as the active provider. The key never reaches the browser.

## Architecture

Browser speech recognition (when available) supplies input. The client assigns every request a monotonic generation number, uses `AbortController` to cancel its fetch, stops browser/Rime playback, and ignores every result whose generation is no longer current. The Node server is a minimal server-side Rime proxy and synthesizes concise incident responses.

`GET /api/health` safely reveals the active provider and audio configuration, but never returns credentials. The UI uses this to make Rime/fallback status visible during the demo.

## Rime configuration

- Endpoint: `https://users.rime.ai/v1/rime-tts` (override with `RIME_ENDPOINT` for a closer region)
- Model: `mistv3` by default (`RIME_MODEL_ID`)
- Speaker: `astra` by default (`RIME_SPEAKER`)
- Language: `eng` (`RIME_LANG`)
- Format/transport: streamed HTTP response requested as `audio/mpeg`, proxied over HTTPS

Use a current Rime voice/model pairing from the live catalog before submission.

## Limits

Browser speech recognition and the no-key audio fallback depend on browser capabilities. The compact server proxy returns a full MP3 before playback rather than chunk-playing it; production should stream chunks to reduce time to first audible response. No external incident systems are contacted.

## Test

`npm test` verifies the fencing invariant. For the full acceptance test, send a request and hit **Interrupt** during speech; then submit a revision. The prior audio must stop and no late reply must be spoken.

## Deploy to Vercel

Import this GitHub repository in Vercel. Add `RIME_API_KEY` as an environment variable for Production, Preview, and Development. Do not use or upload `.env`. Vercel serves the browser app from `public/` and runs the secure Rime proxy in `api/`.
