/**
 * Security utility functions for input validation and sanitization
 */

// Constants for validation
const MAX_STRING_LENGTH = 1000;
const MAX_EMAIL_LENGTH = 254;
const MAX_TEXT_AREA_LENGTH = 5000;
const MAX_JSON_SIZE = 1048576; // 1MB

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// HTML/Script sanitization regex
const HTML_REGEX = /<[^>]*>/g;
const SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;

/**
 * Validates an email address
 */
export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string' || email.length > MAX_EMAIL_LENGTH) {
    return false;
  }
  return EMAIL_REGEX.test(email);
}

/**
 * Sanitizes a string by removing potentially dangerous characters
 */
export function sanitizeString(input: string, maxLength = MAX_STRING_LENGTH): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(HTML_REGEX, '') // Remove HTML tags
    .replace(SCRIPT_REGEX, '') // Remove script tags
    .replace(/[<>'"]/g, '') // Remove potentially dangerous characters
    .trim()
    .substring(0, maxLength);
}

/**
 * Sanitizes textarea content (allows more length but still removes dangerous content)
 */
export function sanitizeTextArea(input: string): string {
  return sanitizeString(input, MAX_TEXT_AREA_LENGTH);
}

/**
 * Validates form response data structure and size
 */
export function validateFormResponseData(data: unknown): data is Record<string, unknown> {
  // Check if data is an object
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return false;
  }
  
  // Check JSON size limit
  const jsonString = JSON.stringify(data);
  if (jsonString.length > MAX_JSON_SIZE) {
    return false;
  }
  
  // Check for reasonable number of fields (max 100)
  const keys = Object.keys(data);
  if (keys.length > 100) {
    return false;
  }
  
  // Validate each field value
  for (const [key, value] of Object.entries(data)) {
    // Key validation
    if (typeof key !== 'string' || key.length > 100) {
      return false;
    }
    
    // Value validation based on type
    if (typeof value === 'string') {
      if (value.length > MAX_TEXT_AREA_LENGTH) {
        return false;
      }
    } else if (Array.isArray(value)) {
      if (value.length > 50 || !value.every(item => 
        typeof item === 'string' && item.length <= MAX_STRING_LENGTH
      )) {
        return false;
      }
    } else if (value !== null && typeof value !== 'boolean' && typeof value !== 'number') {
      // Check if it's a signature field object
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const signatureObj = value as Record<string, unknown>;
        
        // Validate signature object structure
        if (signatureObj.type && signatureObj.data && 
            typeof signatureObj.type === 'string' && 
            typeof signatureObj.data === 'string') {
          
          // Validate signature type
          if (!['drawn', 'typed'].includes(signatureObj.type)) {
            return false;
          }
          
          // Validate signature data (base64 image or empty string)
          if (signatureObj.data !== '' && !validateSignatureData(signatureObj.data)) {
            return false;
          }
          
          // Validate optional typed name
          if (signatureObj.typedName !== undefined && 
              (typeof signatureObj.typedName !== 'string' || 
               signatureObj.typedName.length > MAX_STRING_LENGTH)) {
            return false;
          }
        } else {
          return false;
        }
      } else {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Validates URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates file upload (signature data)
 */
export function validateSignatureData(data: string): boolean {
  if (typeof data !== 'string') {
    return false;
  }
  
  // Check for base64 data URL format for signatures
  const base64Regex = /^data:image\/(png|jpeg|svg\+xml);base64,/;
  if (!base64Regex.test(data)) {
    return false;
  }
  
  // Check size limit (500KB for signatures)
  if (data.length > 500000) {
    return false;
  }
  
  return true;
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }
  
  checkLimit(identifier: string): boolean {
    const now = Date.now();
    const requestData = this.requests.get(identifier);
    
    if (!requestData || now > requestData.resetTime) {
      this.requests.set(identifier, { count: 1, resetTime: now + this.windowMs });
      return true;
    }
    
    if (requestData.count >= this.maxRequests) {
      return false;
    }
    
    requestData.count++;
    return true;
  }
  
  // Clean up old entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.requests.entries()) {
      if (now > data.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}