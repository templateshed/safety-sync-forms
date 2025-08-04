// Utility for handling custom domain configuration for form links

/**
 * Get the base URL for form links. 
 * This can be configured to use a custom domain instead of the current origin.
 */
export const getFormBaseUrl = (): string => {
  // Check if there's a custom domain configured in localStorage or environment
  const customDomain = localStorage.getItem('customDomain');
  
  if (customDomain) {
    // Ensure it starts with https:// if no protocol is specified
    if (!customDomain.startsWith('http://') && !customDomain.startsWith('https://')) {
      return `https://${customDomain}`;
    }
    return customDomain;
  }
  
  // Fall back to current origin
  return window.location.origin;
};

/**
 * Generate a complete form URL using the configured domain
 */
export const generateFormUrl = (formIdentifier: string): string => {
  const baseUrl = getFormBaseUrl();
  return `${baseUrl}/form/${formIdentifier}`;
};

/**
 * Set a custom domain for form links
 */
export const setCustomDomain = (domain: string): void => {
  if (domain) {
    localStorage.setItem('customDomain', domain);
  } else {
    localStorage.removeItem('customDomain');
  }
};

/**
 * Get the currently configured custom domain
 */
export const getCustomDomain = (): string | null => {
  return localStorage.getItem('customDomain');
};