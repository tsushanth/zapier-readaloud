'use strict';

const zapier = require('zapier-platform-core');
const nock = require('nock');

// Fake values only. Never put a real key in this file.
process.env.ZAPIER_DEPLOY_KEY = 'fake-deploy-key-for-rpc-mock';

const App = require('../index');
const appTester = zapier.createAppTester(App);
zapier.tools.env.inject();

const API = 'https://api.readaloudai.org';
const authData = { api_key: 'test-key-not-real' };
const AUDIO = Buffer.from('ID3-fake-mp3-bytes-0123456789');

const mockStash = () => {
  nock('https://rpc.zapier.com')
    .post('/cli')
    .reply(200, (uri, body) => {
      const req = typeof body === 'string' ? JSON.parse(body) : body;
      return {
        id: req.id,
        result: {
          url: 'https://stash.example.com/bucket',
          fields: { key: 'uploads/speech.mp3', policy: 'x' },
        },
      };
    });
  return nock('https://stash.example.com').post('/bucket').reply(204);
};

const run = (inputData, extra = {}) =>
  appTester(App.creates.convert_text_to_speech.operation.perform, {
    authData,
    inputData,
    ...extra,
  });

afterEach(() => nock.cleanAll());

describe('authentication', () => {
  test('test call sends Bearer key to GET /v1/voices', async () => {
    nock(API, { reqheaders: { authorization: 'Bearer test-key-not-real' } })
      .get('/v1/voices')
      .reply(200, { voices: [] });
    const res = await appTester(App.authentication.test, { authData });
    expect(res.voices).toEqual([]);
  });

  test('401 becomes ExpiredAuthError', async () => {
    nock(API).get('/v1/voices').reply(401, { error: { message: 'bad key' } });
    await expect(
      appTester(App.authentication.test, { authData }),
    ).rejects.toThrow(/API key was rejected/);
  });
});

describe('voice_list trigger', () => {
  test('puts piper-default first and maps voices', async () => {
    nock(API)
      .get('/v1/voices')
      .reply(200, {
        voices: [
          { voice_id: 'a', name: 'Alpha', language: 'en', gender: 'female' },
          { voice_id: 'piper-default', name: 'Default' },
        ],
      });
    const out = await appTester(App.triggers.voice_list.operation.perform, {
      authData,
    });
    expect(out[0].id).toBe('piper-default');
    expect(out).toHaveLength(2);
    expect(out[1]).toEqual({ id: 'a', name: 'Alpha - en - female' });
  });

  test('is hidden and voice field is free-text capable', () => {
    expect(App.triggers.voice_list.display.hidden).toBe(true);
    const f = App.creates.convert_text_to_speech.operation.inputFields.find(
      (x) => x.key === 'voice',
    );
    expect(f.default).toBe('piper-default');
    expect(f.type).toBe('string');
    expect(f.choices).toBeUndefined();
    expect(f.dynamic).toBe('voice_list.id.name');
  });
});

describe('convert_text_to_speech', () => {
  test('sends the right body and returns a stashed file', async () => {
    let sent;
    nock(API, { reqheaders: { authorization: 'Bearer test-key-not-real' } })
      .post('/v1/audio/speech', (b) => ((sent = b), true))
      .reply(200, AUDIO, { 'Content-Type': 'audio/mpeg' });
    const stash = mockStash();
    const out = await run({ text: 'Hello there' });
    expect(sent).toEqual({
      model: 'tts-1',
      input: 'Hello there',
      voice: 'piper-default',
      response_format: 'mp3',
      speed: 1,
    });
    expect(out.file).toBe('https://stash.example.com/uploads/speech.mp3');
    expect(out.file_name).toBe('speech.mp3');
    expect(out.bytes).toBe(AUDIO.length);
    expect(out.characters).toBe(11);
    expect(stash.isDone()).toBe(true);
  });

  test('custom voice, format, speed and file name', async () => {
    let sent;
    nock(API)
      .post('/v1/audio/speech', (b) => ((sent = b), true))
      .reply(200, AUDIO, { 'Content-Type': 'audio/wav' });
    mockStash();
    const out = await run({
      text: 'Hi',
      voice: 'my-custom-voice',
      format: 'wav',
      speed: '1.5',
      file_name: 'greeting.mp3',
    });
    expect(sent.voice).toBe('my-custom-voice');
    expect(sent.response_format).toBe('wav');
    expect(sent.speed).toBe(1.5);
    expect(out.file_name).toBe('greeting.wav');
  });

  test.each([
    [{ text: '   ' }, /Text field is empty/],
    [{ text: 'x'.repeat(5001) }, /at most 5000/],
    [{ text: 'x', speed: '9' }, /between 0.25 and 4/],
    [{ text: 'x', format: 'pcm' }, /Unsupported audio format/],
  ])('rejects bad input %j', async (input, msg) => {
    await expect(run(input)).rejects.toThrow(msg);
  });

  test('401 -> ExpiredAuthError', async () => {
    nock(API).post('/v1/audio/speech').reply(401, { error: 'nope' });
    await expect(run({ text: 'x' })).rejects.toThrow(/API key was rejected/);
  });

  test('402 -> shared free allowance message', async () => {
    nock(API).post('/v1/audio/speech').reply(402, { error: 'quota' });
    await expect(run({ text: 'x' })).rejects.toThrow(
      /shared pool for the whole account/,
    );
  });

  test('429 -> ThrottledError', async () => {
    nock(API)
      .post('/v1/audio/speech')
      .reply(429, { error: { message: 'slow down' } }, { 'Retry-After': '7' });
    // Zapier core itself raises a ThrottledError (with the Retry-After delay)
    // for 429 before our middleware runs.
    await expect(run({ text: 'x' })).rejects.toThrow(/429.*"delay":7/);
  });

  test('503 -> ThrottledError', async () => {
    nock(API).post('/v1/audio/speech').reply(503, 'busy');
    await expect(run({ text: 'x' })).rejects.toThrow(/busy or rate limiting/);
  });

  test('422 -> request rejected with API reason', async () => {
    nock(API)
      .post('/v1/audio/speech')
      .reply(422, { error: { message: 'unknown voice zzz' } });
    await expect(run({ text: 'x', voice: 'zzz' })).rejects.toThrow(
      /rejected the request: unknown voice zzz/,
    );
  });

  test('500 -> generic error with status', async () => {
    nock(API).post('/v1/audio/speech').reply(500, { message: 'boom' });
    await expect(run({ text: 'x' })).rejects.toThrow(/HTTP 500\): boom/);
  });

  test('empty audio body is an error', async () => {
    nock(API).post('/v1/audio/speech').reply(200, '', { 'Content-Type': 'audio/mpeg' });
    await expect(run({ text: 'x' })).rejects.toThrow(/empty audio/);
  });
});
