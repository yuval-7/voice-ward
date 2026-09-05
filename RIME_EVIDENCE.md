# Rime evidence

## Hard voice claim

Voice Ward remains conversationally correct when the user interrupts a pending or spoken answer: stale synthesis and stale asynchronous results never become the current answer.

## Acceptance test

1. Send: `The west pump is overheating. Check shutdown procedure.`
2. While the assistant is thinking or speaking, click **Interrupt**.
3. Send: `Cancel that. Check the east pump instead.`
4. Pass only if the previous audio stops promptly and only the east-pump response is allowed to play.

## Procedure

Each request receives an increasing generation token. Interrupt increments it, aborts the pending HTTP request, and cancels the audio element / SpeechSynthesis queue. On completion, the client plays a result only if its token equals the latest token.

## Result

`npm test` checks the token-fencing invariant. The browser acceptance test visibly adds an interruption event and prevents the invalidated response from reaching playback.

## Limitations

Network cancellation is best-effort once a provider has begun synthesis, so the client-side fence is the authoritative correctness control. The current proxy buffers Rime MP3 output before playback; it is deliberately simple for the demo and should be converted to chunk streaming for production latency.
