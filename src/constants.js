'use strict';

module.exports = {
  BASE_URL: 'https://api.readaloudai.org',
  DEFAULT_VOICE: 'piper-default',
  DEFAULT_MODEL: 'tts-1',
  MAX_CHARACTERS: 5000,
  MIN_SPEED: 0.25,
  MAX_SPEED: 4,
  // pcm is intentionally not offered: it is headerless raw audio that
  // downstream Zapier apps cannot play or attach.
  FORMATS: {
    mp3: { mimeType: 'audio/mpeg', extension: 'mp3' },
    wav: { mimeType: 'audio/wav', extension: 'wav' },
    opus: { mimeType: 'audio/ogg', extension: 'opus' },
  },
};
