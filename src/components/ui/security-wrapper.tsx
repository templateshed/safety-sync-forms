import { useEffect } from 'react';
import { sanitizeString, isValidEmail, validateFormResponseData } from '@/utils/security';

/**
 * Security wrapper component that provides validation utilities to child components
 */
interface SecurityWrapperProps {
  children: React.ReactNode;
}

export function SecurityWrapper({ children }: SecurityWrapperProps) {
  useEffect(() => {
    // Add security event listeners
    const handleBeforeUnload = () => {
      // Clear any sensitive data from memory if needed
      // This is a placeholder for cleanup operations
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return <>{children}</>;
}

/**
 * Hook for form validation with security checks
 */
export function useSecureValidation() {
  const validateFormData = (data: Record<string, unknown>) => {
    const errors: Record<string, string> = {};

    // Validate the overall structure
    if (!validateFormResponseData(data)) {
      errors._form = 'Invalid form data structure or size limit exceeded';
      return { isValid: false, errors };
    }

    // Validate individual fields
    Object.entries(data).forEach(([key, value]) => {
      // Sanitize the key
      const sanitizedKey = sanitizeString(key, 100);
      if (sanitizedKey !== key) {
        errors[key] = 'Invalid field name';
        return;
      }

      // Validate field values based on type
      if (typeof value === 'string') {
        // Check for potentially dangerous content
        if (value !== sanitizeString(value, 5000)) {
          errors[key] = 'Field contains invalid characters';
        }
        
        // Email validation
        if (key.toLowerCase().includes('email') && value && !isValidEmail(value)) {
          errors[key] = 'Invalid email format';
        }
      } else if (Array.isArray(value)) {
        // Validate array content
        const hasInvalidItems = value.some(item => 
          typeof item !== 'string' || item !== sanitizeString(item, 1000)
        );
        if (hasInvalidItems) {
          errors[key] = 'Invalid array content';
        }
      }
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };

  const sanitizeFormData = (data: Record<string, unknown>): Record<string, unknown> => {
    const sanitized: Record<string, unknown> = {};

    Object.entries(data).forEach(([key, value]) => {
      const sanitizedKey = sanitizeString(key, 100);
      
      if (typeof value === 'string') {
        sanitized[sanitizedKey] = sanitizeString(value, 5000);
      } else if (Array.isArray(value)) {
        sanitized[sanitizedKey] = value.map(item => 
          typeof item === 'string' ? sanitizeString(item, 1000) : item
        );
      } else {
        sanitized[sanitizedKey] = value;
      }
    });

    return sanitized;
  };

  return {
    validateFormData,
    sanitizeFormData,
    sanitizeString,
    isValidEmail
  };
}