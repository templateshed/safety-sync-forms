// Domain utility for consistent URL generation
export const getBaseUrl = (): string => {
  return 'https://forms.ascendrix.co.uk';
};

export const getFormUrl = (identifier: string): string => {
  return `${getBaseUrl()}/form/${identifier}`;
};