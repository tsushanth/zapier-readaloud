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
  // Cheap authenticated call (costs no characters); returns 401 for a bad key and the account's plan tier.
  test: {
    url: `${BASE_URL}/v1/user/subscription`,
    method: 'GET',
  },
  // Shows the plan of the connected account (for example "paid account"). Optional per Zapier, and never the key itself.
  connectionLabel: '{{json.tier}} account',
};
