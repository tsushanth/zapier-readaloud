'use strict';

// Maps ReadAloud API failures to Zapier's error classes so users get an
// actionable message and Zapier applies the right behaviour (reconnect
// prompt, automatic retry with backoff, or a plain failed step).

const FALLBACK = 'No details were returned by ReadAloud.';

const readBody = async (response) => {
  // Normal responses expose parsed `data`/`content`. Raw (streamed) responses
  // only expose text()/buffer().
  try {
    if (response.data !== undefined && response.data !== null) {
      return response.data;
    }
  } catch (e) {
    // raw response: fall through to text()
  }
  let text;
  try {
    text = response.content; // throws on raw responses
  } catch (e) {
    text = undefined;
  }
  if (text === undefined && typeof response.text === 'function') {
    try {
      text = await response.text();
    } catch (e) {
      text = '';
    }
  }
  if (Buffer.isBuffer(text)) text = text.toString('utf8');
  if (typeof text !== 'string') return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
};

const apiMessage = (body) => {
  if (!body) return FALLBACK;
  if (typeof body === 'string') return body.slice(0, 300) || FALLBACK;
  if (typeof body === 'object') {
    const err = body.error;
    if (err && typeof err === 'object' && typeof err.message === 'string') {
      return err.message;
    }
    if (typeof err === 'string') return err;
    if (typeof body.message === 'string') return body.message;
    if (typeof body.detail === 'string') return body.detail;
  }
  return FALLBACK;
};

const retryAfterSeconds = (response) => {
  const headers = response.headers;
  const raw =
    headers && typeof headers.get === 'function'
      ? headers.get('retry-after')
      : headers && headers['retry-after'];
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.ceil(n), 3600) : undefined;
};

// Builds the right Zapier error for a failed response.
const errorFor = (z, response, body) => {
  const status = response.status;
  const reason = apiMessage(body);
  switch (status) {
    case 401:
      return new z.errors.ExpiredAuthError(
        'Your ReadAloud API key was rejected. Reconnect ReadAloud with a valid API key.',
      );
    case 402:
      return new z.errors.Error(
        'Your ReadAloud account has used up its free allowance. The free allowance is one shared pool for the whole account across all of its API keys, so a new key will not help. Add credit or upgrade at https://readaloudai.org, then replay the step.',
        'PaymentRequired',
        status,
      );
    case 429:
    case 503:
      return new z.errors.ThrottledError(
        `ReadAloud is busy or rate limiting requests. Zapier will retry automatically. ${reason}`,
        retryAfterSeconds(response),
      );
    case 400:
    case 404:
    case 422:
      return new z.errors.Error(
        `ReadAloud rejected the request: ${reason}`,
        'InvalidRequest',
        status,
      );
    default:
      return new z.errors.Error(
        `ReadAloud request failed (HTTP ${status}): ${reason}`,
        'ReadAloudError',
        status,
      );
  }
};

// afterResponse middleware.
const handleErrors = async (response, z) => {
  if (response.status < 400) return response;
  const body = await readBody(response);
  throw errorFor(z, response, body);
};

module.exports = { handleErrors, errorFor, apiMessage, readBody };
