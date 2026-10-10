# Changelog

## 0.1.1

- Connection test is now `GET /v1/user/subscription` and the connection label shows the account's plan (publishing requirement 5.6: no hard-coded app name).
- Listing description rewritten to the required form ("ReadAloud is a ...", no mention of Zapier or other apps).
- Only `piper-default` is offered for now: removed the hidden `voice_list` trigger; the Voice field is a single fixed choice.

## 0.1.0

- API key authentication with a `GET /v1/voices` connection test.
- Action: Convert Text to Speech (text, voice, MP3/WAV/Opus, speed, file name), output stored with `z.stashFile`.
- Hidden `voice_list` trigger for the Voice dropdown; `piper-default` is the default and first entry.
- Error mapping to `ExpiredAuthError`, `ThrottledError` and `Error` with clear messages.
- Offline (nock) tests and an opt-in live test.
