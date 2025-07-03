// Utility functions for handling short codes

export const SHORT_CODE_REGEX = /^[A-Z0-9]{6,8}$/;

/**
 * Validates if a string is a valid short code format
 */
export const isValidShortCode = (code: string): boolean => {
  return SHORT_CODE_REGEX.test(code);
};

/**
 * Validates if a string looks like a UUID
 */
export const isUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

/**
 * Determines the identifier type and returns normalized values
 */
export const parseFormIdentifier = (identifier: string) => {
  if (isUUID(identifier)) {
    return { type: 'uuid', value: identifier };
  } else if (isValidShortCode(identifier.toUpperCase())) {
    return { type: 'short_code', value: identifier.toUpperCase() };
  } else {
    return { type: 'invalid', value: identifier };
  }
};

/**
 * Formats a short code for display (adds hyphens for readability)
 */
export const formatShortCodeForDisplay = (code: string): string => {
  if (code.length <= 4) return code;
  if (code.length <= 6) return `${code.slice(0, 3)}-${code.slice(3)}`;
  return `${code.slice(0, 4)}-${code.slice(4)}`;
};

/**
 * Removes formatting from a short code for database storage
 */
export const normalizeShortCode = (code: string): string => {
  return code.replace(/[-\s]/g, '').toUpperCase();
};