/**
 * Secret Redaction Utility
 * Centralized credential sanitization for logging
 * Prevents MongoDB URIs, passwords, tokens, and API keys from appearing in logs
 */

/**
 * Redact MongoDB connection strings
 * Handles both mongodb:// and mongodb+srv:// formats
 * @param {string} str - String that may contain MongoDB URI
 * @returns {string} - Sanitized string with credentials redacted
 */
export function redactMongoURI(str) {
  if (typeof str !== 'string') {
    return str;
  }

  // Redact mongodb:// and mongodb+srv:// URIs with username:password format
  // Pattern: mongodb[+srv]://username:password@host
  return str.replace(/mongodb(\+srv)?:\/\/([^:/@]+):([^@/]+)@/gi, 'mongodb$1://***:***@');
}

/**
 * Redact common secret patterns
 * @param {string} str - String that may contain secrets
 * @returns {string} - Sanitized string
 */
export function redactSecrets(str) {
  if (typeof str !== 'string') {
    return str;
  }

  let sanitized = str;

  // MongoDB URIs
  sanitized = redactMongoURI(sanitized);

  // API keys and tokens (common patterns)
  sanitized = sanitized
    .replace(/(['"](api_?key|apikey|api_token|access_token|secret_key|private_key)['"]:\s*['"])([^'"]+)(['"])/gi, '$1***$4')
    .replace(/(api_?key|apikey|api_token|access_token|secret_key|private_key)=([^\s&]+)/gi, '$1=***')
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer ***')
    .replace(/\b[A-Za-z0-9]{32,}\b/g, (match) => {
      // Redact long alphanumeric strings that look like API keys
      if (match.length >= 32 && /^[A-Za-z0-9]+$/.test(match)) {
        return '***';
      }
      return match;
    });

  // Password fields in URLs and JSON
  sanitized = sanitized
    .replace(/([?&]password=)[^&\s]*/gi, '$1***')
    .replace(/(['"]password['"]:\s*['"])([^'"]+)(['"])/gi, '$1***$3');

  return sanitized;
}

/**
 * Redact secrets from an error object
 * Sanitizes message, stack, and nested error properties
 * @param {Error} error - Error object
 * @returns {Object} - Sanitized error object safe for logging
 */
export function redactError(error) {
  if (!error) {
    return null;
  }

  const sanitized = {
    message: redactSecrets(error.message || ''),
    name: error.name,
    code: error.code,
    statusCode: error.statusCode,
  };

  // Sanitize stack trace
  if (error.stack) {
    sanitized.stack = redactSecrets(error.stack);
  }

  // Sanitize nested errors
  if (error.cause) {
    sanitized.cause = redactError(error.cause);
  }

  // Sanitize metadata/context
  if (error.context && typeof error.context === 'object') {
    sanitized.context = redactObject(error.context);
  }

  return sanitized;
}

/**
 * Redact secrets from an object (deep)
 * @param {Object} obj - Object that may contain secrets
 * @param {WeakSet} seen - Track visited objects to prevent circular reference issues
 * @returns {Object} - Sanitized object
 */
export function redactObject(obj, seen = new WeakSet()) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  // Prevent circular reference infinite loop
  if (seen.has(obj)) {
    return '[Circular Reference]';
  }

  seen.add(obj);

  if (Array.isArray(obj)) {
    return obj.map(item => redactObject(item, seen));
  }

  const sanitized = {};
  const secretKeys = [
    'password', 'passwordHash', 'secret', 'apiKey', 'api_key',
    'token', 'accessToken', 'access_token', 'refreshToken',
    'authorization', 'auth', 'privateKey', 'private_key',
    'mongodbUri', 'mongodb_uri', 'databaseUri', 'database_uri',
    'connectionString', 'connection_string', 'uri',
  ];

  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase();

    // Check if key is a known secret field
    const isSecretKey = secretKeys.some(secretKey =>
      keyLower.includes(secretKey.toLowerCase()),
    );

    if (isSecretKey) {
      sanitized[key] = '***';
    } else if (typeof value === 'string') {
      sanitized[key] = redactSecrets(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = redactObject(value, seen);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Redact secrets from any value (auto-detect type)
 * @param {any} value - Value that may contain secrets
 * @returns {any} - Sanitized value
 */
export function redact(value) {
  if (typeof value === 'string') {
    return redactSecrets(value);
  }

  if (value instanceof Error) {
    return redactError(value);
  }

  if (typeof value === 'object' && value !== null) {
    return redactObject(value);
  }

  return value;
}

/**
 * Safe MongoDB URI display
 * @param {string} uri - MongoDB URI
 * @returns {string} - Safe display version
 */
export function safeMongoDisplay(uri) {
  if (!uri || typeof uri !== 'string') {
    return '[no URI configured]';
  }

  // Extract database name and host without credentials
  try {
    const redacted = redactMongoURI(uri);
    return redacted;
  } catch (error) {
    return '[invalid URI format]';
  }
}

export default {
  redactMongoURI,
  redactSecrets,
  redactError,
  redactObject,
  redact,
  safeMongoDisplay,
};
