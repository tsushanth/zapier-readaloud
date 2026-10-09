'use strict';

const {
  BASE_URL,
  DEFAULT_VOICE,
  DEFAULT_MODEL,
  MAX_CHARACTERS,
  MIN_SPEED,
  MAX_SPEED,
  FORMATS,
} = require('../constants');
const { errorFor, readBody } = require('../errors');

const safeBaseName = (name) => {
  const cleaned = String(name || 'speech')
    .trim()
    .replace(/\.[A-Za-z0-9]{2,4}$/, '') // drop a typed extension
    .replace(/[^\w\-. ]+/g, '_')
    .slice(0, 80);
  return cleaned || 'speech';
};

const perform = async (z, bundle) => {
  const input = bundle.inputData;
  const text = typeof input.text === 'string' ? input.text : '';
  const voice = String(input.voice || '').trim() || DEFAULT_VOICE;
  const format = input.format || 'mp3';
  const speed =
    input.speed === undefined || input.speed === null || input.speed === ''
      ? 1
      : Number(input.speed);

  if (!text.trim()) {
    throw new z.errors.Error(
      'The Text field is empty. Provide the text you want spoken.',
      'InvalidInput',
      400,
    );
  }
  if (text.length > MAX_CHARACTERS) {
    throw new z.errors.Error(
      `The text is ${text.length} characters long. ReadAloud accepts at most ${MAX_CHARACTERS} characters per request; split the text into smaller parts.`,
      'InvalidInput',
      400,
    );
  }
  if (!FORMATS[format]) {
    throw new z.errors.Error(
      `Unsupported audio format "${format}". Use mp3, wav or opus.`,
      'InvalidInput',
      400,
    );
  }
  if (!Number.isFinite(speed) || speed < MIN_SPEED || speed > MAX_SPEED) {
    throw new z.errors.Error(
      `Speed must be a number between ${MIN_SPEED} and ${MAX_SPEED}.`,
      'InvalidInput',
      400,
    );
  }

  // raw: true streams the binary audio instead of decoding it as text.
  const response = await z.request({
    url: `${BASE_URL}/v1/audio/speech`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: '*/*' },
    body: {
      model: DEFAULT_MODEL,
      input: text,
      voice,
      response_format: format,
      speed,
    },
    raw: true,
    skipThrowForStatus: true,
  });

  if (response.status >= 400) {
    throw errorFor(z, response, await readBody(response));
  }

  const audio = await response.buffer();
  if (!audio || audio.length === 0) {
    throw new z.errors.Error(
      'ReadAloud returned an empty audio response. Replay the step; if it keeps happening, contact ReadAloud support.',
      'EmptyResponse',
      502,
    );
  }

  const meta = FORMATS[format];
  const headerType = String(
    (response.headers && response.headers.get('content-type')) || '',
  )
    .split(';')[0]
    .trim();
  const mimeType = headerType.startsWith('audio/') ? headerType : meta.mimeType;
  const fileName = `${safeBaseName(input.file_name)}.${meta.extension}`;

  const file = await z.stashFile(audio, audio.length, fileName, mimeType);

  return {
    id: `${Date.now()}`,
    file,
    file_name: fileName,
    voice,
    format,
    characters: text.length,
    bytes: audio.length,
  };
};

module.exports = {
  key: 'convert_text_to_speech',
  noun: 'Speech',
  display: {
    label: 'Convert Text to Speech',
    description:
      'Converts text to spoken audio and returns an audio file you can use in later steps.',
  },
  operation: {
    inputFields: [
      {
        key: 'text',
        label: 'Text',
        type: 'text',
        required: true,
        helpText: `The text to speak. Up to ${MAX_CHARACTERS} characters.`,
      },
      {
        key: 'voice',
        label: 'Voice',
        type: 'string',
        required: false,
        default: DEFAULT_VOICE,
        choices: { [DEFAULT_VOICE]: `${DEFAULT_VOICE} (default)` },
        helpText: `Currently only \`${DEFAULT_VOICE}\` is offered.`,
      },
      {
        key: 'format',
        label: 'Audio Format',
        required: false,
        default: 'mp3',
        choices: { mp3: 'MP3', wav: 'WAV', opus: 'Opus (Ogg)' },
        helpText: 'The format of the audio file. MP3 works almost everywhere.',
      },
      {
        key: 'speed',
        label: 'Speed',
        type: 'number',
        required: false,
        default: '1',
        helpText: `Speaking speed from ${MIN_SPEED} to ${MAX_SPEED}. 1 is normal speed.`,
      },
      {
        key: 'file_name',
        label: 'File Name',
        type: 'string',
        required: false,
        default: 'speech',
        helpText:
          'Name for the audio file, without the extension. The extension is added from the audio format.',
      },
    ],
    perform,
    sample: {
      id: '1760000000000',
      file: 'https://zapier-dev-files.s3.amazonaws.com/cli-platform/example/speech.mp3',
      file_name: 'speech.mp3',
      voice: DEFAULT_VOICE,
      format: 'mp3',
      characters: 27,
      bytes: 41472,
    },
    outputFields: [
      { key: 'file', label: 'Audio File', type: 'file' },
      { key: 'file_name', label: 'File Name' },
      { key: 'voice', label: 'Voice' },
      { key: 'format', label: 'Audio Format' },
      { key: 'characters', label: 'Characters', type: 'integer' },
      { key: 'bytes', label: 'File Size (Bytes)', type: 'integer' },
    ],
  },
};
