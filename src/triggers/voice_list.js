'use strict';

const { BASE_URL, DEFAULT_VOICE } = require('../constants');

// Hidden trigger: feeds the Voice dropdown of the action.
const perform = async (z) => {
  const response = await z.request({ url: `${BASE_URL}/v1/voices` });
  const voices = Array.isArray(response.data && response.data.voices)
    ? response.data.voices
    : [];

  const list = voices
    .filter((v) => v && v.voice_id)
    .map((v) => ({
      id: v.voice_id,
      name: [v.name || v.voice_id, v.language, v.gender]
        .filter(Boolean)
        .join(' - '),
    }));

  // The default voice is always the first entry.
  const rest = list.filter((v) => v.id !== DEFAULT_VOICE);
  return [{ id: DEFAULT_VOICE, name: `${DEFAULT_VOICE} (default)` }, ...rest];
};

module.exports = {
  key: 'voice_list',
  noun: 'Voice',
  display: {
    label: 'Voice List',
    description: 'Lists the voices available to the connected account.',
    hidden: true,
  },
  operation: {
    perform,
    sample: { id: DEFAULT_VOICE, name: `${DEFAULT_VOICE} (default)` },
    outputFields: [
      { key: 'id', label: 'Voice ID' },
      { key: 'name', label: 'Name' },
    ],
  },
};
