// Utility for handling custom domain configuration for form links

/**
 * Get the base URL for form links using the app's custom domain
 */
export const getFormBaseUrl = (): string => {
  // Use the app's custom domain for all form links
  return 'https://forms.ascendrix.co.uk';
};

/**
 * Generate a complete form URL using the custom domain
 */
export const generateFormUrl = (formIdentifier: string): string => {
  const baseUrl = getFormBaseUrl();
  return `${baseUrl}/form/${formIdentifier}`;
};