// @kickstock/ticker — Twitter/X API v2 client
// Zero external SDK. OAuth 1.0a HMAC-SHA1 signature built from scratch.

const crypto = require("crypto");
const https = require("https");
const { config } = require("./config");

// ---------------------------------------------------------------------------
// Rate-limit state: sliding window of tweet timestamps
// ---------------------------------------------------------------------------
const tweetTimestamps = [];

function isRateLimited() {
  const now = Date.now();
  const cutoff = now - config.rateLimit.windowMs;
  // Prune old entries
  while (tweetTimestamps.length > 0 && tweetTimestamps[0] < cutoff) {
    tweetTimestamps.shift();
  }
  return tweetTimestamps.length >= config.rateLimit.maxTweets;
}

function recordTweet() {
  tweetTimestamps.push(Date.now());
}

// ---------------------------------------------------------------------------
// OAuth 1.0a helpers
// ---------------------------------------------------------------------------

/** Percent-encode per RFC 3986 */
function percentEncode(str) {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

/** Generate a 32-byte random nonce (hex) */
function generateNonce() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Build the OAuth 1.0a Authorization header value.
 * @param {string} method  HTTP method (POST)
 * @param {string} url     Full URL (no query string)
 * @param {Record<string,string>} oauthParams  OAuth params (without signature)
 * @returns {string} The Authorization header value
 */
function buildOAuthHeader(method, url, oauthParams) {
  const { apiSecret, accessSecret } = config.twitter;

  // 1. Collect all params (oauth_* only for POST with JSON body)
  const allParams = { ...oauthParams };

  // 2. Sort and concatenate
  const paramString = Object.keys(allParams)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join("&");

  // 3. Signature base string
  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramString),
  ].join("&");

  // 4. Signing key
  const signingKey = `${percentEncode(apiSecret)}&${percentEncode(accessSecret)}`;

  // 5. HMAC-SHA1
  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");

  // 6. Build header
  const authParams = { ...oauthParams, oauth_signature: signature };
  const header = Object.keys(authParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(authParams[k])}"`)
    .join(", ");

  return `OAuth ${header}`;
}

// ---------------------------------------------------------------------------
// Post tweet
// ---------------------------------------------------------------------------

const TWEET_URL = "https://api.twitter.com/2/tweets";

/**
 * Post a tweet to X (Twitter) using API v2.
 * Respects DRY_RUN mode and rate limits.
 *
 * @param {string} text  Tweet text (max 280 chars)
 * @returns {Promise<{posted: boolean, id?: string, reason?: string}>}
 */
async function postTweet(text) {
  // Truncate to 280 chars
  const truncated = text.length > 280 ? text.slice(0, 277) + "..." : text;

  // Rate-limit check
  if (isRateLimited()) {
    console.log(
      `[twitter] RATE LIMITED — skipping tweet (${tweetTimestamps.length}/${config.rateLimit.maxTweets} in window)`
    );
    return { posted: false, reason: "rate_limited" };
  }

  // Dry-run mode
  if (config.dryRun) {
    console.log(`[twitter] DRY_RUN tweet (${truncated.length} chars):`);
    console.log(`  "${truncated}"`);
    recordTweet();
    return { posted: false, reason: "dry_run" };
  }

  // Build OAuth params
  const oauthParams = {
    oauth_consumer_key: config.twitter.apiKey,
    oauth_nonce: generateNonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: config.twitter.accessToken,
    oauth_version: "1.0",
  };

  const authorization = buildOAuthHeader("POST", TWEET_URL, oauthParams);
  const body = JSON.stringify({ text: truncated });

  return new Promise((resolve, reject) => {
    const urlObj = new URL(TWEET_URL);
    const req = https.request(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname,
        method: "POST",
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode === 201 || res.statusCode === 200) {
            const parsed = JSON.parse(data);
            const tweetId = parsed?.data?.id;
            console.log(`[twitter] Posted tweet id=${tweetId}`);
            recordTweet();
            resolve({ posted: true, id: tweetId });
          } else {
            console.error(
              `[twitter] API error ${res.statusCode}: ${data}`
            );
            resolve({
              posted: false,
              reason: `api_error_${res.statusCode}`,
            });
          }
        });
      }
    );
    req.on("error", (err) => {
      console.error(`[twitter] Request error: ${err.message}`);
      reject(err);
    });
    req.write(body);
    req.end();
  });
}

module.exports = { postTweet, isRateLimited };
