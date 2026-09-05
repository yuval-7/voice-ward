# Four-minute demo script

1. **Problem (0:00-0:30).** "Field operators often have both hands occupied. A normal voice assistant becomes unsafe when it keeps talking after a person corrects it. Voice Ward is an incident desk built around interruption and recovery."
2. **Normal flow (0:30-1:30).** Enter or dictate: "The west pump is overheating. Check shutdown procedure." Point out the active provider label. With `RIME_API_KEY` configured, it reads **Rime**; otherwise it explicitly declares the development fallback.
3. **Hard voice problem (1:30-2:45).** While the reply is playing, press **Interrupt**. Explain: "This stops local or Rime playback, aborts the request, and increases a generation token. Any result from the old generation is ignored."
4. **Stress case (2:45-3:30).** Immediately submit: "Cancel that. Check the east pump instead." Verify the transcript contains an interruption event and only the revised response plays.
5. **Evidence (3:30-4:00).** Show `RIME_EVIDENCE.md`, run `npm test`, and point to the server-side Rime proxy plus `.env.example`. State the limitation: the demo buffers MP3 before playback; production should chunk-stream for lower first-audible latency.
