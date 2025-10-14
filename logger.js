/**
 * Logging Module
 * Provides structured logging utilities
 */

/**
 * Log info message
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 */
export function logInfo(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[INFO] ${timestamp} - ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

/**
 * Log error message
 * @param {string} message - Error message
 * @param {Error|Object} error - Error object or data
 */
export function logError(message, error = null) {
  const timestamp = new Date().toISOString();
  console.error(`[ERROR] ${timestamp} - ${message}`);
  if (error) {
    if (error instanceof Error) {
      console.error(error.stack || error.message);
    } else {
      console.error(JSON.stringify(error, null, 2));
    }
  }
}

/**
 * Log debug message (only in dev mode)
 * @param {string} message - Debug message
 * @param {Object} data - Additional data to log
 */
export function logDebug(message, data = null) {
  if (process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();
    console.log(`[DEBUG] ${timestamp} - ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }
}

/**
 * Log request
 * @param {string} path - Request path
 * @param {Object} body - Request body
 */
export function logRequest(path, body) {
  logInfo(`Request: ${path}`);
  if (process.env.DEBUG === 'true') {
    logDebug('Request body:', body);
  }
}

/**
 * Log response
 * @param {number} status - Response status code
 * @param {Error} error - Error if any
 * @param {Object} data - Response data
 */
export function logResponse(status, error = null, data = null) {
  if (error) {
    logError(`Response: ${status}`, error);
  } else {
    logInfo(`Response: ${status}`);
    if (process.env.DEBUG === 'true' && data) {
      logDebug('Response data:', data);
    }
  }
}

