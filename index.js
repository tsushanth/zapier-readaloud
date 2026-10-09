'use strict';

const { version } = require('./package.json');
const platformVersion = require('zapier-platform-core').version;

const authentication = require('./src/authentication');
const { handleErrors } = require('./src/errors');
const voiceList = require('./src/triggers/voice_list');
const convertTextToSpeech = require('./src/creates/convert_text_to_speech');

// Sends the API key as a Bearer token on every request.
const addAuthHeader = (request, z, bundle) => {
  if (bundle.authData && bundle.authData.api_key) {
    request.headers = request.headers || {};
    request.headers.Authorization = `Bearer ${bundle.authData.api_key}`;
  }
  return request;
};

module.exports = {
  version,
  platformVersion,
  flags: { cleanInputData: false },
  authentication,
  beforeRequest: [addAuthHeader],
  afterResponse: [handleErrors],
  triggers: { [voiceList.key]: voiceList },
  creates: { [convertTextToSpeech.key]: convertTextToSpeech },
};
