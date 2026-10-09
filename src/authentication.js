'use strict';

const { BASE_URL } = require('./constants');

module.exports = {
  type: 'custom',
  fields: [
    {
      key: 'api_key',
      label: 'API Key',
      type: 'password',
      required: true,
      helpText:
        'Create an API key in your account at [readaloudai.org](https://readaloudai.org), then paste it here.',
    },
  ],
  // Cheap authenticated call; returns 401 for a bad key.
  test: {
    url: `${BASE_URL}/v1/voices`,
    method: 'GET',
  },
  connectionLabel: 'ReadAloud',
};
