'use strict';

// Live test against the real API. Skipped unless READALOUD_LIVE=1.
// The key is read from the file named by READALOUD_API_KEY_FILE (or the
// READALOUD_API_KEY variable). It is never logged or written anywhere.
// Stashing needs Zapier's RPC, so this checks the API leg only.

const fs = require('fs');
const zapier = require('zapier-platform-core');
const App = require('../index');

const live = process.env.READALOUD_LIVE === '1';
const key = live
  ? (process.env.READALOUD_API_KEY ||
      fs.readFileSync(process.env.READALOUD_API_KEY_FILE, 'utf8')).trim()
  : '';

(live ? describe : describe.skip)('live ReadAloud API', () => {
  const appTester = zapier.createAppTester(App);
  const authData = { api_key: key };

  test('connection test passes', async () => {
    const res = await appTester(App.authentication.test, { authData });
    expect(['free', 'paid']).toContain(res.tier);
  });

  test('speech returns real audio bytes', async () => {
    // Call the API through the app's own request path, no stash.
    const real = await appTester(
      async (zz, bundle) => {
        const r = await zz.request({
          url: 'https://api.readaloudai.org/v1/audio/speech',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: { model: 'tts-1', input: 'Zapier live check.', voice: 'piper-default', response_format: 'mp3', speed: 1 },
          raw: true,
        });
        const buf = await r.buffer();
        return { status: r.status, bytes: buf.length };
      },
      { authData },
    );
    expect(real.status).toBe(200);
    expect(real.bytes).toBeGreaterThan(1000);
  });
});
