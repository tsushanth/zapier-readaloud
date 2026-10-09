# Instructions for Zapier reviewers

## What the integration does

One action, **Convert Text to Speech**, which sends text to ReadAloud and returns an audio file. There are no triggers visible to users (one hidden helper trigger fills the Voice dropdown).

## Test account

Create an account at https://readaloudai.org and generate an API key in the account area. Paste it into the **API Key** field when connecting.

IMPORTANT: the free allowance is ONE shared pool per account across all of that account's API keys, and it is capped. Creating a new key does not give a new allowance. If the pool is used up the action fails with a clear "free allowance used up" message (HTTP 402). For review, please use an account that has paid billing enabled or extra credit added. The integration owner will supply such an account or credit on request: [OWNER TO FILL IN: reviewer credentials or credit instructions, delivered through the secure channel in the submission form, never committed to this repository].

## Steps to test

1. Create a Zap with any trigger (for example Schedule by Zapier or Catch Hook).
2. Add the action **ReadAloud: Convert Text to Speech**. Connect the account with the API key. The connection test calls `GET /v1/voices`.
3. Set **Text** to a short sentence. Leave **Voice** as `piper-default`, or open the dropdown to pick another voice; you can also type or map a voice ID.
4. Test the step. The output has an **Audio File** URL that downloads a playable MP3, plus file name, voice, format, characters and bytes.
5. Optional: set **Audio Format** to WAV or Opus, **Speed** to 1.5, **File Name** to anything.

## Error behavior to check

- Wrong API key: the step fails and Zapier prompts to reconnect (401 mapped to an expired-auth error).
- Text over 5000 characters or empty text: clear input error before any request is made.
- Rate limits (429/503): mapped to a throttle error so Zapier retries with backoff.

## Notes

- The Voice field is free text capable; the dropdown only suggests values.
- Support contact in the listing: support@readaloudai.org.
