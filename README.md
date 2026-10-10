# ReadAloud for Zapier

A [Zapier](https://zapier.com) integration for [ReadAloud](https://readaloudai.org). It converts text to spoken audio and hands the audio file to the next step of a Zap.

Status: source for a Zapier Platform CLI integration. It is not yet published in the Zapier App Directory.

## What it does

**Action: Convert Text to Speech**

| Field | Notes |
| --- | --- |
| Text | Required. Up to 5000 characters per request. |
| Voice | `piper-default`, currently the only voice offered. |
| Audio Format | MP3 (default), WAV or Opus (Ogg). |
| Speed | 0.25 to 4, default 1. |
| File Name | Optional name without extension; the extension is added from the format. |

Output: `file` (a Zapier-hosted file other steps can attach or upload), `file_name`, `voice`, `format`, `characters`, `bytes`.


## Authentication

API key. The key is sent as `Authorization: Bearer <key>`. Connecting runs `GET /v1/user/subscription` as the connection test (it costs no characters), and the connection is labelled with the plan, for example "paid account".

## Errors

| HTTP status | Zapier behavior |
| --- | --- |
| 401 | `ExpiredAuthError`: Zapier asks the user to reconnect. |
| 402 | Clear message: the free allowance is one shared pool per account across all of its API keys; add credit or upgrade. |
| 429, 503 | `ThrottledError`: Zapier retries with backoff, honoring `Retry-After`. |
| 400, 404, 422 | Error with the reason returned by the API. |
| other 4xx/5xx | Error with status and reason. |

## Development

Requires Node.js 22 or newer.

```sh
npm install
npm test                 # offline: nock-mocked, no network, no key needed
npm run validate         # zapier-platform validate (local, no login)
```

Live test against the real API (skipped by default). Put your key in a file outside the repo and point to it; the key is never printed or stored by the tests:

```sh
READALOUD_LIVE=1 READALOUD_API_KEY_FILE=/path/to/keyfile npm run test:live
```

The live test covers the connection test, the voice list and a real speech request. It does not exercise `z.stashFile`, which only works inside Zapier; the stash flow is covered in the offline tests by mocking Zapier's upload endpoints.

Publishing to Zapier (`zapier-platform login`, `register`, `push`, `promote`) is done by the integration owner and is not part of this repository's tooling. `.zapierapprc` and `.env` are git-ignored.

## Files

- `index.js`: app definition
- `src/`: authentication, error mapping, trigger, action
- `test/`: offline and live tests
- `logo.png`: 512x512 transparent logo
- `docs/LISTING.md`: App Directory listing copy
- `docs/REVIEWER_INSTRUCTIONS.md`: instructions for Zapier's reviewers

## Support

support@readaloudai.org.

## License

MIT. See [LICENSE](LICENSE).
